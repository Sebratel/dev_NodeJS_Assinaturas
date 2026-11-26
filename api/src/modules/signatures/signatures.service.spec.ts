import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { DirectoryService } from '../directory/directory.service.js';
import { Collaborator } from '../directory/types/collaborator.js';
import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import type { PhraseProfilesService } from '../phrase-profiles/phrase-profiles.service.js';
import type { SettingsService } from '../settings/settings.service.js';
import { DEFAULT_SIGNATURE_RULES } from '../signature-rules/default-signature-rules.js';
import type { SignatureRulesService } from '../signature-rules/signature-rules.service.js';
import { RuleOperatorEnum } from '../signature-rules/types/rule-operator.enum.js';
import { SectorLabelEnum } from '../signature-rules/types/sector-label.enum.js';
import type { SignatureTemplatesService } from '../signature-templates/signature-templates.service.js';
import { SimulateSignatureRuleDTO } from './dto/simulate-signature-rule.dto.js';
import { SignatureEngineService } from './signature-engine.service.js';
import { SignaturesService } from './signatures.service.js';

function person(overrides: Partial<Collaborator>): Collaborator {
  return {
    id: 'p1',
    login: 'p1',
    name: 'Fulano',
    email: 'fulano@sebratel.com.br',
    title: 'Analista',
    department: '',
    area: 'Técnica',
    team: 'Operacional',
    level: CollaboratorLevelEnum.MEMBER,
    company: 'Sebratel',
    segment: '',
    corporateMobile: '',
    extension: '',
    informedMobile: '',
    phone0800: '0800 655 1000',
    state: 'RS',
    office: '',
    createdAt: null,
    changedAt: null,
    ...overrides,
  };
}

const PADRAO = { id: 't-padrao', name: 'Padrão', isDefault: true, html: '<p>{{nome}}|{{setor}}|{{cargo}}</p>' };
const EMPRESAS = {
  id: 't-empresas',
  name: 'Sebratel Empresas',
  isDefault: false,
  html: '<p>EMPRESAS {{nome}} {{#setor}}{{setor}} | {{/setor}}{{cargo}}</p>',
};
const PESSOAS = [
  person({ id: 'a', name: 'Ana Interna' }),
  person({ id: 'b', name: 'Bruno B2B', company: 'Sebratel Empresas', team: 'Vendas Externo', corporateMobile: '47999990000' }),
  person({ id: 'c', name: 'Carla B2B', company: 'Sebratel Empresas', team: 'Vendas Externo', corporateMobile: '47999990001' }),
];

function service(): SignaturesService {
  const rules = DEFAULT_SIGNATURE_RULES.map((r, i) => ({ ...r, id: `r${i}` }));
  return new SignaturesService(
    { findAll: async () => PESSOAS } as unknown as DirectoryService,
    { findAll: async () => rules } as unknown as SignatureRulesService,
    { findOne: async () => ({ defaultPhrase: '', byTeam: [] }) } as unknown as SettingsService,
    new SignatureEngineService(),
    { findAll: async () => [PADRAO, EMPRESAS], findDefault: async () => PADRAO } as unknown as SignatureTemplatesService,
    { findAllForEngine: async () => [] } as unknown as PhraseProfilesService,
    new ConfigService({}),
  );
}

/** Rascunho: Sebratel Empresas com modelo próprio e nada antes do cargo. */
function rascunho(extra: Partial<SimulateSignatureRuleDTO> = {}): SimulateSignatureRuleDTO {
  return {
    name: 'Sebratel Empresas: modelo próprio',
    description: '',
    priority: 15,
    active: true,
    conditions: [{ field: 'company', operator: RuleOperatorEnum.IN, values: ['Sebratel Empresas'] }],
    outputs: { templateId: EMPRESAS.id, sectorLabel: SectorLabelEnum.NONE },
    ...extra,
  } as SimulateSignatureRuleDTO;
}

describe('SignaturesService.simulate · prévia da assinatura no editor de regra', () => {
  it('sem pessoa pedida, mostra a primeira que a regra pega, já com o rascunho aplicado', async () => {
    const { preview, matched } = await service().simulate(rascunho());
    expect(matched).toBe(2);
    expect(preview).toMatchObject({
      collaboratorId: 'b',
      name: 'Bruno B2B',
      templateName: 'Sebratel Empresas',
      matched: true,
      changed: true,
    });
    expect(preview?.html).toBe('<p>EMPRESAS Bruno B2B Analista</p>');
    expect(preview?.decidedHere.sort()).toEqual(['sectorLabel', 'template']);
  });

  it('mostra a pessoa pedida', async () => {
    const { preview } = await service().simulate(rascunho({ previewCollaboratorId: 'c' }));
    expect(preview?.name).toBe('Carla B2B');
  });

  it('pessoa que a regra não pega: a prévia mostra a assinatura dela sem mudança', async () => {
    const { preview } = await service().simulate(rascunho({ previewCollaboratorId: 'a' }));
    expect(preview).toMatchObject({ name: 'Ana Interna', templateName: 'Padrão', matched: false, changed: false, decidedHere: [] });
  });

  it('regra que não pega ninguém: sem prévia', async () => {
    const draft = rascunho({ conditions: [{ field: 'company', operator: RuleOperatorEnum.IN, values: ['Outra'] }] });
    expect((await service().simulate(draft)).preview).toBeNull();
  });
});
