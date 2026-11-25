import { describe, expect, it } from 'vitest';
import { Collaborator } from '../directory/types/collaborator.js';
import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { PhraseProfile } from '../phrase-profiles/types/phrase-profile.types.js';
import { DEFAULT_SIGNATURE_RULES } from '../signature-rules/default-signature-rules.js';
import { PhraseModeEnum } from '../signature-rules/types/phrase-mode.enum.js';
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

    const aux = engine.evaluate(
      person({ level: CollaboratorLevelEnum.AUXILIARY, team: 'Suporte Técnico', corporateMobile: '51988887777' }),
      rules,
      phrases,
    );
    expect(aux.decisions.contact?.value).toBe(ContactTypeEnum.CORPORATE_MOBILE);
    expect(aux.content.contactText).toBe('(51) 98888-7777');
  });

  it('B2B troca o 0800 e mantém o resto das regras de prioridade maior', () => {
    const result = engine.evaluate(person({ company: 'Sebratel Empresas', level: CollaboratorLevelEnum.MANAGER }), rules, phrases);
    expect(result.content.phone0800).toBe('0800 365 8000');
    expect(result.decisions.contact?.value).toBe(ContactTypeEnum.INFORMED_MOBILE);
  });

  it('"Nada" antes do cargo deixa o setor vazio (o modelo mostra só o cargo)', () => {
    const soCargo: SignatureRule = {
      id: 'sc',
      name: 'Sebratel Empresas: só o cargo',
      description: '',
      priority: 15,
      active: true,
      conditions: [{ field: 'company', operator: RuleOperatorEnum.IN, values: ['Sebratel Empresas'] }],
      outputs: { sectorLabel: SectorLabelEnum.NONE },
    };
    // celular preenchido: a regra B2B pede o corporativo (sem ele, ficaria Pendente por outro motivo)
    const result = engine.evaluate(person({ company: 'Sebratel Empresas', corporateMobile: '47999990000' }), [...rules, soCargo], phrases);
    expect(result.decisions.sectorLabel?.value).toBe(SectorLabelEnum.NONE);
    expect(result.content.sectorText).toBe('');
    expect(result.status).toBe(SignatureStatusEnum.READY);
  });

  it('aponta conflito quando duas regras de mesma prioridade decidem diferente a mesma parte', () => {
    const result = engine.evaluate(
      person({ team: 'Dho', level: CollaboratorLevelEnum.MANAGER, informedMobile: '51999990000' }),
      rules,
      phrases,
    );
    expect(result.status).toBe(SignatureStatusEnum.CONFLICT);
    expect(result.conflicts.map((c) => c.slot).sort()).toEqual(['contact', 'sectorLabel']);
  });

  it('conflito some quando uma regra de prioridade maior decide a parte', () => {
    const tieBreaker: SignatureRule = {
      id: 'tb',
      name: 'DHO: desempate',
      description: '',
      priority: 25,
      active: true,
      conditions: [{ field: 'team', operator: RuleOperatorEnum.IN, values: ['Dho'] }],
      outputs: { contact: ContactTypeEnum.INFORMED_MOBILE, sectorLabel: SectorLabelEnum.AREA },
    };
    const result = engine.evaluate(
      person({ team: 'Dho', level: CollaboratorLevelEnum.MANAGER, informedMobile: '51999990000' }),
      [...rules, tieBreaker],
      phrases,
    );
    expect(result.status).toBe(SignatureStatusEnum.READY);
    expect(result.conflicts).toEqual([]);
  });

  it('regra inativa não vale e sem nenhuma regra o status é NO_RULE', () => {
    const inactive = rules.map((r) => ({ ...r, active: false }));
    expect(engine.evaluate(person({}), inactive, phrases).status).toBe(SignatureStatusEnum.NO_RULE);
  });

  describe('perfis de frase', () => {
    const direcaoTecnica: PhraseProfile = {
      id: 'pf1',
      name: 'Direção da Técnica',
      priority: 10,
      active: true,
      phrase: 'A rede inteira a gente garante.',
      conditions: [
        { field: 'level', operator: RuleOperatorEnum.IN, values: [CollaboratorLevelEnum.DIRECTOR] },
        { field: 'area', operator: RuleOperatorEnum.IN, values: ['Técnica'] },
      ],
    };
    const todaTecnica: PhraseProfile = {
      id: 'pf2',
      name: 'Toda a Técnica',
      priority: 5,
      active: true,
      phrase: 'A técnica a gente garante.',
      conditions: [{ field: 'area', operator: RuleOperatorEnum.IN, values: ['Técnica'] }],
    };
    const profiles = [todaTecnica, direcaoTecnica];

    it('perfil que casa vence a frase do time; o de prioridade maior vence o de menor', () => {
      const diretor = engine.evaluate(person({ level: CollaboratorLevelEnum.DIRECTOR, team: 'Suporte Técnico' }), rules, phrases, profiles);
      expect(diretor.content.phrase).toBe('A rede inteira a gente garante.');
      expect(diretor.phraseOrigin).toEqual({ kind: 'PROFILE', label: 'Direção da Técnica', id: 'pf1' });

      const membro = engine.evaluate(person({ team: 'Suporte Técnico', extension: '4021' }), rules, phrases, profiles);
      expect(membro.phraseOrigin.id).toBe('pf2');
    });

    it('sem perfil: frase do time; sem time: padrão — e a origem diz qual foi', () => {
      const suporte = engine.evaluate(person({ area: 'Comercial', team: 'Suporte Técnico', extension: '1' }), rules, phrases, profiles);
      expect(suporte.phraseOrigin).toMatchObject({ kind: 'TEAM' });
      expect(suporte.content.phrase).toBe('Suporte que resolve.');
      const outro = engine.evaluate(person({ area: 'Comercial' }), rules, phrases, profiles);
      expect(outro.phraseOrigin.kind).toBe('DEFAULT');
      expect(outro.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.DEFAULT_PHRASE);
    });

    it('perfil inativo não vale; regra com frase fixa passa por cima do perfil', () => {
      const inactive = [{ ...direcaoTecnica, active: false }];
      expect(engine.evaluate(person({ level: CollaboratorLevelEnum.DIRECTOR }), rules, phrases, inactive).phraseOrigin.kind).toBe(
        'DEFAULT',
      );

      const fixed: SignatureRule = {
        id: 'fx',
        name: 'Frase fixa da diretoria',
        description: '',
        priority: 50,
        active: true,
        conditions: [{ field: 'level', operator: RuleOperatorEnum.IN, values: [CollaboratorLevelEnum.DIRECTOR] }],
        outputs: { phraseMode: PhraseModeEnum.FIXED, phraseText: 'Fixa.' },
      };
      const result = engine.evaluate(person({ level: CollaboratorLevelEnum.DIRECTOR }), [...rules, fixed], phrases, profiles);
      expect(result.content.phrase).toBe('Fixa.');
      expect(result.phraseOrigin).toMatchObject({ kind: 'FIXED', label: 'Frase fixa da diretoria' });
    });
  });
});
