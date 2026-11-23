import { Injectable } from '@nestjs/common';
import { TextHelper } from '../../common/helpers/text.helper.js';
import { Collaborator } from '../directory/types/collaborator.js';
import { TeamPhrases } from '../settings/types/settings-values.js';
import { ContactTypeEnum } from '../signature-rules/types/contact-type.enum.js';
import { Phone0800ModeEnum } from '../signature-rules/types/phone0800-mode.enum.js';
import { PhraseModeEnum } from '../signature-rules/types/phrase-mode.enum.js';
import { RuleOperatorEnum } from '../signature-rules/types/rule-operator.enum.js';
import { SectorLabelEnum } from '../signature-rules/types/sector-label.enum.js';
import { RuleCondition, SignatureRule } from '../signature-rules/types/signature-rule.types.js';
import { SignatureIssueCodeEnum } from './types/signature-issue-code.enum.js';
import { SignatureStatusEnum } from './types/signature-status.enum.js';
import {
  Phone0800Choice,
  PhraseChoice,
  SignatureConflict,
  SignatureDecisions,
  SignatureEvaluation,
  SignatureIssue,
  SignatureSlot,
  SlotDecision,
} from './types/signature-evaluation.types.js';

/**
 * Motor em cascata: todas as regras ativas que casam se aplicam em ordem de prioridade (menor → maior);
 * cada parte da assinatura fica com o valor da regra de maior prioridade que a definiu.
 * Empate de prioridade com valores diferentes na parte vencedora = conflito.
 * Sem estado e sem I/O: recebe tudo por parâmetro.
 */
@Injectable()
export class SignatureEngineService {
  evaluate(collaborator: Collaborator, rules: SignatureRule[], phrases: TeamPhrases): SignatureEvaluation {
    const matched = rules
      .filter((rule) => rule.active && this.matches(collaborator, rule))
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, 'pt-BR'));

    const decisions: SignatureDecisions = { phone0800: null, contact: null, sectorLabel: null, phrase: null, template: null };
    const bySlot = decisions as unknown as Record<SignatureSlot, SlotDecision<unknown> | null>;
    const ties: Array<SignatureConflict & { priority: number }> = [];

    for (const rule of matched) {
      const o = rule.outputs;
      const phrase: PhraseChoice | null = o.phraseMode ? { mode: o.phraseMode, text: o.phraseMode === PhraseModeEnum.FIXED ? o.phraseText ?? '' : null } : null;
      const phoneMode = o.phone0800Mode ?? (o.phone0800 ? Phone0800ModeEnum.FIXED : null);
      const phone: Phone0800Choice | null = phoneMode ? { mode: phoneMode, text: phoneMode === Phone0800ModeEnum.FIXED ? o.phone0800 ?? '' : null } : null;
      const proposals: Array<[SignatureSlot, unknown]> = [
        ['phone0800', phone],
        ['contact', o.contact ?? null],
        ['sectorLabel', o.sectorLabel ?? null],
        ['phrase', phrase],
        ['template', o.templateId || null],
      ];
      for (const [slot, value] of proposals) {
        if (value === null) continue;
        const current = bySlot[slot];
        if (current && current.priority === rule.priority && JSON.stringify(current.value) !== JSON.stringify(value)) {
          ties.push({ slot, ruleNames: [current.ruleName, rule.name], priority: rule.priority });
        }
        bySlot[slot] = { value, ruleId: rule.id, ruleName: rule.name, priority: rule.priority };
      }
    }

    // Empate só importa se nenhuma regra de prioridade maior decidiu a mesma parte depois.
    const conflicts = this.mergeTies(ties.filter((t) => decisions[t.slot]?.priority === t.priority));
    const content = this.buildContent(collaborator, decisions, phrases);
    const issues = this.collectIssues(collaborator, matched, decisions, conflicts, content, phrases);

    let status = SignatureStatusEnum.READY;
    if (!matched.length) status = SignatureStatusEnum.NO_RULE;
    else if (conflicts.length) status = SignatureStatusEnum.CONFLICT;
    else if (issues.some((i) => i.severity === 'ERROR')) status = SignatureStatusEnum.PENDING;

    return {
      collaboratorId: collaborator.id,
      status,
      matchedRules: matched.map((r) => ({ id: r.id, name: r.name, priority: r.priority, general: r.conditions.length === 0 })),
      decisions,
      conflicts,
      issues,
      content,
    };
  }

  matches(collaborator: Collaborator, rule: Pick<SignatureRule, 'conditions'>): boolean {
    return rule.conditions.every((condition) => this.conditionMatches(collaborator, condition));
  }

  private conditionMatches(collaborator: Collaborator, condition: RuleCondition): boolean {
    const value = TextHelper.normalize(collaborator[condition.field]);
    const values = condition.values.map((v) => TextHelper.normalize(v)).filter(Boolean);
    switch (condition.operator) {
      case RuleOperatorEnum.IN:
        return values.includes(value);
      case RuleOperatorEnum.NOT_IN:
        return !values.includes(value);
      case RuleOperatorEnum.CONTAINS:
        return values.some((v) => value.includes(v));
      case RuleOperatorEnum.IS_EMPTY:
        return value === '';
      case RuleOperatorEnum.IS_NOT_EMPTY:
        return value !== '';
      default:
        return false;
    }
  }

  private mergeTies(ties: Array<SignatureConflict & { priority: number }>): SignatureConflict[] {
    const bySlot = new Map<SignatureSlot, Set<string>>();
    for (const tie of ties) {
      const names = bySlot.get(tie.slot) ?? new Set<string>();
      tie.ruleNames.forEach((n) => names.add(n));
      bySlot.set(tie.slot, names);
    }
    return [...bySlot.entries()].map(([slot, names]) => ({ slot, ruleNames: [...names].sort((a, b) => a.localeCompare(b, 'pt-BR')) }));
  }

  private buildContent(collaborator: Collaborator, decisions: SignatureDecisions, phrases: TeamPhrases) {
    const label = decisions.sectorLabel?.value ?? SectorLabelEnum.TEAM;
    const sectorText = (label === SectorLabelEnum.AREA ? collaborator.area : collaborator.team) || collaborator.team || collaborator.area;

    const contactType = decisions.contact?.value ?? ContactTypeEnum.NONE;
    let contactText = '';
    if (contactType === ContactTypeEnum.CORPORATE_MOBILE && collaborator.corporateMobile) contactText = TextHelper.formatPhone(collaborator.corporateMobile);
    if (contactType === ContactTypeEnum.INFORMED_MOBILE && collaborator.informedMobile) contactText = TextHelper.formatPhone(collaborator.informedMobile);
    if (contactType === ContactTypeEnum.EXTENSION && collaborator.extension) contactText = `Ramal ${collaborator.extension}`;

    return {
      name: collaborator.name,
      email: collaborator.email,
      sectorText,
      area: collaborator.area,
      team: collaborator.team,
      title: collaborator.title,
      contactType,
      contactText,
      phrase: this.resolvePhrase(collaborator, decisions.phrase?.value ?? null, phrases),
      phone0800: this.resolvePhone0800(collaborator, decisions.phone0800?.value ?? null),
    };
  }

  /** Do AD só sai se for um 0800 de verdade; número errado no AD não vai para a assinatura. */
  private resolvePhone0800(collaborator: Collaborator, choice: Phone0800Choice | null): string {
    if (!choice) return '';
    if (choice.mode === Phone0800ModeEnum.FIXED) return choice.text ?? '';
    return SignatureEngineService.format0800(collaborator.phone0800) ?? '';
  }

  /** "08006551000" / "0800 655 1000" → "0800 655 1000"; outro formato → null. */
  static format0800(raw: string): string | null {
    const digits = String(raw ?? '').replace(/\D/g, '');
    return /^0800\d{7}$/.test(digits) ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : null;
  }

  private resolvePhrase(collaborator: Collaborator, choice: PhraseChoice | null, phrases: TeamPhrases): string {
    if (!choice || choice.mode === PhraseModeEnum.NONE) return '';
    if (choice.mode === PhraseModeEnum.FIXED) return choice.text ?? '';
    return this.teamPhrase(collaborator, phrases) ?? phrases.defaultPhrase;
  }

  private teamPhrase(collaborator: Collaborator, phrases: TeamPhrases): string | null {
    const team = TextHelper.normalize(collaborator.team);
    return phrases.byTeam.find((p) => TextHelper.normalize(p.team) === team && p.phrase.trim())?.phrase ?? null;
  }

  private collectIssues(
    collaborator: Collaborator,
    matched: SignatureRule[],
    decisions: SignatureDecisions,
    conflicts: SignatureConflict[],
    content: { contactType: ContactTypeEnum; contactText: string; phone0800: string },
    phrases: TeamPhrases,
  ): SignatureIssue[] {
    const issues: SignatureIssue[] = [];
    if (!matched.length) {
      issues.push({ code: SignatureIssueCodeEnum.NO_RULE, severity: 'ERROR', message: 'Nenhuma regra ativa vale para esta pessoa.' });
      return issues;
    }
    for (const conflict of conflicts) {
      issues.push({
        code: SignatureIssueCodeEnum.RULE_CONFLICT,
        severity: 'ERROR',
        message: `Empate em "${SLOT_LABELS[conflict.slot]}": ${conflict.ruleNames.join(' × ')}. Ajuste a prioridade de uma delas.`,
      });
    }
    if (!content.contactText) {
      const missing: Partial<Record<ContactTypeEnum, SignatureIssue>> = {
        [ContactTypeEnum.CORPORATE_MOBILE]: { code: SignatureIssueCodeEnum.MISSING_CORPORATE_MOBILE, severity: 'ERROR', message: 'Celular corporativo vazio no AD.' },
        [ContactTypeEnum.INFORMED_MOBILE]: { code: SignatureIssueCodeEnum.MISSING_INFORMED_MOBILE, severity: 'ERROR', message: 'Aguardando a pessoa informar o celular.' },
        [ContactTypeEnum.EXTENSION]: { code: SignatureIssueCodeEnum.MISSING_EXTENSION, severity: 'ERROR', message: 'Ramal vazio no AD.' },
      };
      const issue = missing[content.contactType];
      if (issue) issues.push(issue);
    }
    const phone = decisions.phone0800?.value;
    if (!phone) {
      issues.push({ code: SignatureIssueCodeEnum.MISSING_PHONE_0800, severity: 'WARNING', message: 'Nenhuma regra definiu o 0800.' });
    } else if (phone.mode === Phone0800ModeEnum.DIRECTORY && !content.phone0800) {
      issues.push(
        collaborator.phone0800.trim()
          ? { code: SignatureIssueCodeEnum.INVALID_PHONE_0800, severity: 'ERROR', message: `Telephone number do AD não é um 0800: "${collaborator.phone0800}".` }
          : { code: SignatureIssueCodeEnum.MISSING_PHONE_0800, severity: 'ERROR', message: 'Telephone number (0800) vazio no AD.' },
      );
    }
    if (matched.every((r) => r.conditions.length === 0)) {
      issues.push({ code: SignatureIssueCodeEnum.ONLY_GENERAL_RULES, severity: 'INFO', message: 'Só a regra geral vale para esta pessoa.' });
    }
    if (decisions.phrase?.value.mode === PhraseModeEnum.TEAM && !this.teamPhrase(collaborator, phrases)) {
      issues.push({ code: SignatureIssueCodeEnum.DEFAULT_PHRASE, severity: 'INFO', message: 'Time sem frase própria: usa a frase padrão.' });
    }
    return issues;
  }
}

export const SLOT_LABELS: Record<SignatureSlot, string> = {
  phone0800: '0800',
  contact: 'Contato',
  sectorLabel: 'Área ou time',
  phrase: 'Frase',
  template: 'Modelo',
};
