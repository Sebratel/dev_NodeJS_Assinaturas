import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextHelper } from '../../common/helpers/text.helper.js';
import { DirectoryService } from '../directory/directory.service.js';
import { Collaborator } from '../directory/types/collaborator.js';
import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { SettingsService } from '../settings/settings.service.js';
import { SettingKeyEnum } from '../settings/types/setting-key.enum.js';
import { TeamPhrases } from '../settings/types/settings-values.js';
import { SignatureRuleEntity } from '../signature-rules/entities/signature-rule.entity.js';
import { SignatureRulesService } from '../signature-rules/signature-rules.service.js';
import { ContactTypeEnum } from '../signature-rules/types/contact-type.enum.js';
import { SignatureRule } from '../signature-rules/types/signature-rule.types.js';
import { SignatureTemplatesService } from '../signature-templates/signature-templates.service.js';
import { SavePhraseProfileDTO } from '../phrase-profiles/dto/save-phrase-profile.dto.js';
import { PhraseProfilesService } from '../phrase-profiles/phrase-profiles.service.js';
import { PhraseProfile } from '../phrase-profiles/types/phrase-profile.types.js';
import { TemplateRenderHelper } from '../signature-templates/template-render.helper.js';
import { CoverageReportBuilder } from './coverage-report.builder.js';
import { ListCollaboratorsQueryDTO } from './dto/list-collaborators-query.dto.js';
import { SimulateSignatureRuleDTO } from './dto/simulate-signature-rule.dto.js';
import { SignatureEngineService } from './signature-engine.service.js';
import { GMAIL_SIGNATURE_MAX_LENGTH, SignatureTemplateHelper } from './signature-template.helper.js';
import { CoverageReport, PhraseProfileSimulation, RuleSimulation } from './types/coverage-report.types.js';
import { SignatureEvaluation } from './types/signature-evaluation.types.js';
import { SignatureIssueCodeEnum } from './types/signature-issue-code.enum.js';
import { SignatureStatusEnum } from './types/signature-status.enum.js';

export interface CollaboratorListItem {
  id: string;
  name: string;
  email: string;
  title: string;
  area: string;
  team: string;
  level: CollaboratorLevelEnum;
  status: SignatureStatusEnum;
  contactType: ContactTypeEnum;
  issueCodes: SignatureIssueCodeEnum[];
}

export interface CollaboratorSignature {
  collaborator: Collaborator;
  evaluation: SignatureEvaluation;
  template: { id: string; name: string; fallback: boolean };
  html: string;
  htmlLength: number;
  gmailLimit: number;
}

const DEFAULT_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/Sebratel/dev_Sebratel_Images/main/';

/** Junta diretório + regras + configurações e entrega o que as telas precisam. */
@Injectable()
export class SignaturesService {
  constructor(
    private readonly directoryService: DirectoryService,
    private readonly signatureRulesService: SignatureRulesService,
    private readonly settingsService: SettingsService,
    private readonly signatureEngine: SignatureEngineService,
    private readonly signatureTemplatesService: SignatureTemplatesService,
    private readonly phraseProfilesService: PhraseProfilesService,
    private readonly configService: ConfigService,
  ) {}

  async listCollaborators(query: ListCollaboratorsQueryDTO): Promise<CollaboratorListItem[]> {
    const { collaborators, evaluations } = await this.evaluateAll();
    const search = TextHelper.normalize(query.search);
    const same = (a: string, b?: string) => !b || TextHelper.normalize(a) === TextHelper.normalize(b);

    return collaborators
      .map((c, i) => ({ c, e: evaluations[i] }))
      .filter(({ c, e }) => {
        if (search && ![c.name, c.email, c.title, c.team, c.area].some((v) => TextHelper.normalize(v).includes(search))) return false;
        return same(c.area, query.area) && same(c.team, query.team) && (!query.level || c.level === query.level) && (!query.status || e.status === query.status);
      })
      .map(({ c, e }) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        title: c.title,
        area: c.area,
        team: c.team,
        level: c.level,
        status: e.status,
        contactType: e.content.contactType,
        issueCodes: e.issues.filter((i) => i.severity !== 'INFO').map((i) => i.code),
      }));
  }

  async getFacets(): Promise<{
    areas: string[];
    teams: Array<{ area: string; team: string; count: number }>;
    levels: CollaboratorLevelEnum[];
    companies: Array<{ company: string; count: number }>;
  }> {
    const collaborators = await this.directoryService.findAll();
    const sort = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
    const teams = new Map<string, { area: string; team: string; count: number }>();
    collaborators
      .filter((c) => c.team)
      .forEach((c) => {
        const key = `${c.area}|${c.team}`;
        const current = teams.get(key) ?? { area: c.area, team: c.team, count: 0 };
        current.count++;
        teams.set(key, current);
      });
    const companies = new Map<string, number>();
    collaborators.filter((c) => c.company).forEach((c) => companies.set(c.company, (companies.get(c.company) ?? 0) + 1));
    return {
      areas: [...new Set(collaborators.map((c) => c.area).filter(Boolean))].sort(sort),
      teams: [...teams.values()].sort((a, b) => sort(a.team, b.team)),
      levels: Object.values(CollaboratorLevelEnum),
      companies: [...companies.entries()].map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count),
    };
  }

  /** Assinatura final da pessoa: avaliação das regras + modelo escolhido + HTML. */
  async getCollaboratorSignature(id: string): Promise<CollaboratorSignature> {
    const [collaborator, rules, phrases, profiles] = await Promise.all([
      this.directoryService.findOne(id),
      this.loadRules(),
      this.loadPhrases(),
      this.phraseProfilesService.findAllForEngine(),
    ]);
    const evaluation = this.signatureEngine.evaluate(collaborator, rules, phrases, profiles);
    const template = await this.resolveTemplate(evaluation.decisions.template?.value ?? null);
    const html = SignatureTemplateHelper.render(evaluation.content, this.imageBaseUrl(), template.html);
    return {
      collaborator,
      evaluation,
      template: { id: template.id, name: template.name, fallback: template.fallback },
      html,
      htmlLength: html.length,
      gmailLimit: GMAIL_SIGNATURE_MAX_LENGTH,
    };
  }

  /** Assinatura final de todo mundo de uma vez (uma leitura de regras/modelos), para a gravação automática. */
  async renderAll(): Promise<Array<{ collaborator: Collaborator; status: SignatureStatusEnum; html: string; htmlLength: number }>> {
    const { collaborators, evaluations } = await this.evaluateAll();
    const templates = await this.signatureTemplatesService.findAll();
    const byId = new Map(templates.map((t) => [t.id, t]));
    const fallback = templates.find((t) => t.isDefault) ?? (await this.signatureTemplatesService.findDefault());
    return collaborators.map((collaborator, i) => {
      const evaluation = evaluations[i];
      const template = byId.get(evaluation.decisions.template?.value ?? '') ?? fallback;
      const html = SignatureTemplateHelper.render(evaluation.content, this.imageBaseUrl(), template.html);
      return { collaborator, status: evaluation.status, html, htmlLength: html.length };
    });
  }

  /** Prévia de um modelo (ainda não salvo) com os dados de uma pessoa real. */
  async previewTemplate(templateHtml: string, collaboratorId: string): Promise<{ html: string; htmlLength: number; gmailLimit: number; problems: string[] }> {
    const [collaborator, rules, phrases, profiles] = await Promise.all([
      this.directoryService.findOne(collaboratorId),
      this.loadRules(),
      this.loadPhrases(),
      this.phraseProfilesService.findAllForEngine(),
    ]);
    const evaluation = this.signatureEngine.evaluate(collaborator, rules, phrases, profiles);
    const problems = TemplateRenderHelper.validate(templateHtml);
    const html = SignatureTemplateHelper.render(evaluation.content, this.imageBaseUrl(), templateHtml);
    return { html, htmlLength: html.length, gmailLimit: GMAIL_SIGNATURE_MAX_LENGTH, problems };
  }

  /** Modelo da regra; se foi excluído depois, cai no padrão e avisa. */
  private async resolveTemplate(templateId: string | null): Promise<{ id: string; name: string; html: string; fallback: boolean }> {
    if (templateId) {
      const chosen = (await this.signatureTemplatesService.findAll()).find((t) => t.id === templateId);
      if (chosen) return { id: chosen.id, name: chosen.name, html: chosen.html, fallback: false };
    }
    const fallback = await this.signatureTemplatesService.findDefault();
    return { id: fallback.id, name: fallback.name, html: fallback.html, fallback: Boolean(templateId) };
  }

  async getCoverage(): Promise<CoverageReport> {
    const { collaborators, evaluations, rules, profiles } = await this.evaluateAll();
    const report = CoverageReportBuilder.build(collaborators, evaluations, rules);
    report.phraseProfiles = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      priority: p.priority,
      active: p.active,
      matched: collaborators.filter((c) => this.signatureEngine.matches(c, p)).length,
      wins: evaluations.filter((e) => e.phraseOrigin.id === p.id).length,
    }));
    return report;
  }

  /** Efeito de um perfil de frase antes de salvar: quem ele pega e de quem ele passa a decidir a frase. */
  async simulatePhraseProfile(draft: SavePhraseProfileDTO): Promise<PhraseProfileSimulation> {
    const draftProfile: PhraseProfile = { id: draft.id ?? 'draft', ...PhraseProfilesService.clean(draft) };
    const { collaborators, evaluations, rules, phrases, profiles } = await this.evaluateAll();
    const nextProfiles = [...profiles.filter((p) => p.id !== draftProfile.id), draftProfile];
    const matched = collaborators.filter((c) => this.signatureEngine.matches(c, draftProfile));
    const winners = collaborators
      .map((c, i) => ({ c, before: evaluations[i], after: this.signatureEngine.evaluate(c, rules, phrases, nextProfiles) }))
      .filter(({ after }) => after.phraseOrigin.id === draftProfile.id);
    return {
      matched: matched.length,
      wins: winners.length,
      /** Quem casa mas não recebe: regra com frase fixa/sem frase, ou outro perfil de prioridade maior. */
      overridden: matched.length - winners.length,
      sample: winners.slice(0, 8).map(({ c, before }) => ({ ...CoverageReportBuilder.sample(c), phraseBefore: before.content.phrase })),
    };
  }

  /** Mostra o efeito de uma regra antes de salvar: quem ela pega e como mudam os status. */
  async simulate(draft: SimulateSignatureRuleDTO): Promise<RuleSimulation> {
    SignatureRulesService.assertConsistent(draft);
    const { collaborators, evaluations, rules, phrases, profiles } = await this.evaluateAll();
    const draftRule: SignatureRule = { id: draft.id ?? 'draft', ...SignatureRulesService.clean(draft) };
    const nextRules = [...rules.filter((r) => r.id !== draftRule.id), draftRule];
    const nextEvaluations = collaborators.map((c) => this.signatureEngine.evaluate(c, nextRules, phrases, profiles));
    const matchedPeople = collaborators.filter((c) => this.signatureEngine.matches(c, draftRule));

    return {
      matched: matchedPeople.length,
      wins: CoverageReportBuilder.winsOf(draftRule.id, nextEvaluations),
      sample: matchedPeople.slice(0, 8).map(CoverageReportBuilder.sample),
      before: CoverageReportBuilder.countByStatus(evaluations),
      after: CoverageReportBuilder.countByStatus(nextEvaluations),
    };
  }

  private async evaluateAll(): Promise<{
    collaborators: Collaborator[];
    evaluations: SignatureEvaluation[];
    rules: SignatureRule[];
    phrases: TeamPhrases;
    profiles: PhraseProfile[];
  }> {
    const [collaborators, rules, phrases, profiles] = await Promise.all([
      this.directoryService.findAll(),
      this.loadRules(),
      this.loadPhrases(),
      this.phraseProfilesService.findAllForEngine(),
    ]);
    const evaluations = collaborators.map((c) => this.signatureEngine.evaluate(c, rules, phrases, profiles));
    return { collaborators, evaluations, rules, phrases, profiles };
  }

  private async loadRules(): Promise<SignatureRule[]> {
    return (await this.signatureRulesService.findAll()).map((entity: SignatureRuleEntity) => ({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      priority: entity.priority,
      active: entity.active,
      conditions: entity.conditions,
      outputs: entity.outputs,
    }));
  }

  private loadPhrases(): Promise<TeamPhrases> {
    return this.settingsService.findOne(SettingKeyEnum.TEAM_PHRASES);
  }

  private imageBaseUrl(): string {
    return this.configService.get<string>('SIGNATURE_IMAGE_BASE_URL') || DEFAULT_IMAGE_BASE_URL;
  }
}
