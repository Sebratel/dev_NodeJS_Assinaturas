import { describe, expect, it } from 'vitest';
import { Collaborator } from '../directory/types/collaborator.js';
import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { DEFAULT_SIGNATURE_RULES } from '../signature-rules/default-signature-rules.js';
import { ContactTypeEnum } from '../signature-rules/types/contact-type.enum.js';
import { RuleOperatorEnum } from '../signature-rules/types/rule-operator.enum.js';
import { SectorLabelEnum } from '../signature-rules/types/sector-label.enum.js';
import { SignatureRule } from '../signature-rules/types/signature-rule.types.js';
import { SignatureEngineService } from './signature-engine.service.js';
import { SignatureIssueCodeEnum } from './types/signature-issue-code.enum.js';
import { SignatureStatusEnum } from './types/signature-status.enum.js';

const engine = new SignatureEngineService();
const rules: SignatureRule[] = DEFAULT_SIGNATURE_RULES.map((r, i) => ({ ...r, id: `r${i}` }));
const phrases = { defaultPhrase: 'Fico à disposição.', byTeam: [{ team: 'Suporte Técnico', phrase: 'Suporte que resolve.' }] };

function person(overrides: Partial<Collaborator>): Collaborator {
  return {
    id: 'p1', login: 'p1', name: 'Fulano', email: 'fulano@sebratel.com.br', title: 'Analista', department: '',
    area: 'Técnica', team: 'Operacional', level: CollaboratorLevelEnum.MEMBER, company: 'Sebratel', segment: '',
    corporateMobile: '', extension: '', informedMobile: '', phone0800: '0800 655 1000', state: 'RS', office: '', createdAt: null, changedAt: null,
    ...overrides,
  };
}

describe('SignatureEngineService', () => {
  it('0800 vem do AD (Telephone number), formatado; valor que não é 0800 não vai para a assinatura', () => {
    expect(engine.evaluate(person({ phone0800: '08006551000' }), rules, phrases).content.phone0800).toBe('0800 655 1000');

    const celularNoCampo = engine.evaluate(person({ phone0800: '55996651254' }), rules, phrases);
    expect(celularNoCampo.content.phone0800).toBe('');
    expect(celularNoCampo.status).toBe(SignatureStatusEnum.PENDING);
    expect(celularNoCampo.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.INVALID_PHONE_0800);

    const trocado = engine.evaluate(person({ phone0800: '655 0800 1000' }), rules, phrases);
    expect(trocado.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.INVALID_PHONE_0800);

    const vazio = engine.evaluate(person({ phone0800: '' }), rules, phrases);
    expect(vazio.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.MISSING_PHONE_0800);
    expect(vazio.status).toBe(SignatureStatusEnum.PENDING);
  });

  it('B2B (Company "Sebratel Empresas", sem ligar para maiúscula/acento) usa o 0800 fixo da regra', () => {
    const result = engine.evaluate(person({ company: 'SEBRATEL EMPRESAS', corporateMobile: '51988887777' }), rules, phrases);
    expect(result.content.phone0800).toBe('0800 365 8000');
    expect(result.content.contactText).toBe('(51) 98888-7777');
    expect(engine.evaluate(person({ company: 'Sebratel' }), rules, phrases).content.phone0800).toBe('0800 655 1000');
  });

  it('membro sem regra específica fica só com a regra geral: 0800, frase padrão, sem contato', () => {
    const result = engine.evaluate(person({}), rules, phrases);
    expect(result.status).toBe(SignatureStatusEnum.READY);
    expect(result.content.phone0800).toBe('0800 655 1000');
    expect(result.content.contactType).toBe(ContactTypeEnum.NONE);
    expect(result.content.phrase).toBe('Fico à disposição.');
    expect(result.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([SignatureIssueCodeEnum.ONLY_GENERAL_RULES, SignatureIssueCodeEnum.DEFAULT_PHRASE]),
    );
  });

  it('membro do Suporte mostra o ramal e a frase do time; sem ramal no AD fica pendente', () => {
    const semRamal = engine.evaluate(person({ team: 'Suporte Técnico' }), rules, phrases);
    expect(semRamal.status).toBe(SignatureStatusEnum.PENDING);
    expect(semRamal.decisions.contact?.ruleName).toBe('Atendimento: ramal');
    expect(semRamal.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.MISSING_EXTENSION);

    const comRamal = engine.evaluate(person({ team: 'suporte tecnico', extension: '4021' }), rules, phrases);
    expect(comRamal.status).toBe(SignatureStatusEnum.READY);
    expect(comRamal.content.contactText).toBe('Ramal 4021');
    expect(comRamal.content.phrase).toBe('Suporte que resolve.');
  });

  it('gerente mostra a área e o celular informado; auxiliar do Suporte fica com o celular corporativo (prioridade 20 < 30 não se aplica a não-membro)', () => {
    const gerente = engine.evaluate(person({ level: CollaboratorLevelEnum.MANAGER, informedMobile: '51999990000' }), rules, phrases);
    expect(gerente.content.sectorText).toBe('Técnica');
    expect(gerente.decisions.sectorLabel?.value).toBe(SectorLabelEnum.AREA);
    expect(gerente.content.contactText).toBe('(51) 99999-0000');

    const aux = engine.evaluate(person({ level: CollaboratorLevelEnum.AUXILIARY, team: 'Suporte Técnico', corporateMobile: '51988887777' }), rules, phrases);
    expect(aux.decisions.contact?.value).toBe(ContactTypeEnum.CORPORATE_MOBILE);
    expect(aux.content.contactText).toBe('(51) 98888-7777');
  });

  it('B2B troca o 0800 e mantém o resto das regras de prioridade maior', () => {
    const result = engine.evaluate(person({ company: 'Sebratel Empresas', level: CollaboratorLevelEnum.MANAGER }), rules, phrases);
    expect(result.content.phone0800).toBe('0800 365 8000');
    expect(result.decisions.contact?.value).toBe(ContactTypeEnum.INFORMED_MOBILE);
  });

  it('aponta conflito quando duas regras de mesma prioridade decidem diferente a mesma parte', () => {
    const result = engine.evaluate(person({ team: 'Dho', level: CollaboratorLevelEnum.MANAGER, informedMobile: '51999990000' }), rules, phrases);
    expect(result.status).toBe(SignatureStatusEnum.CONFLICT);
    expect(result.conflicts.map((c) => c.slot).sort()).toEqual(['contact', 'sectorLabel']);
  });

  it('conflito some quando uma regra de prioridade maior decide a parte', () => {
    const tieBreaker: SignatureRule = {
      id: 'tb', name: 'DHO: desempate', description: '', priority: 25, active: true,
      conditions: [{ field: 'team', operator: RuleOperatorEnum.IN, values: ['Dho'] }],
      outputs: { contact: ContactTypeEnum.INFORMED_MOBILE, sectorLabel: SectorLabelEnum.AREA },
    };
    const result = engine.evaluate(person({ team: 'Dho', level: CollaboratorLevelEnum.MANAGER, informedMobile: '51999990000' }), [...rules, tieBreaker], phrases);
    expect(result.status).toBe(SignatureStatusEnum.READY);
    expect(result.conflicts).toEqual([]);
  });

  it('regra inativa não vale e sem nenhuma regra o status é NO_RULE', () => {
    const inactive = rules.map((r) => ({ ...r, active: false }));
    expect(engine.evaluate(person({}), inactive, phrases).status).toBe(SignatureStatusEnum.NO_RULE);
  });
});
