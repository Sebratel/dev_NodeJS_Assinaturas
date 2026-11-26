import { describe, expect, it } from 'vitest';
import { Collaborator } from '../directory/types/collaborator.js';
import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { PhraseProfile } from '../phrase-profiles/types/phrase-profile.types.js';
import { DEFAULT_SIGNATURE_RULES } from '../signature-rules/default-signature-rules.js';
import { RuleOutputsHelper } from '../signature-rules/rule-outputs.helper.js';
import { RuleOperatorEnum } from '../signature-rules/types/rule-operator.enum.js';
import { RuleVariable, SignatureRule } from '../signature-rules/types/signature-rule.types.js';
import { VariableSourceEnum } from '../signature-rules/types/variable-source.enum.js';
import { SignatureEngineService } from './signature-engine.service.js';
import { SignatureIssueCodeEnum } from './types/signature-issue-code.enum.js';
import { SignatureStatusEnum } from './types/signature-status.enum.js';

const engine = new SignatureEngineService();
const rules: SignatureRule[] = DEFAULT_SIGNATURE_RULES.map((r, i) => ({ ...r, id: `r${i}` }));
const phrases = { defaultPhrase: 'Fico à disposição.', byTeam: [{ team: 'Suporte Técnico', phrase: 'Suporte que resolve.' }] };

const field = (key: string, fieldKey: string): RuleVariable => ({ key, source: VariableSourceEnum.FIELD, field: fieldKey });
const text = (key: string, value: string): RuleVariable => ({ key, source: VariableSourceEnum.TEXT, text: value });
const empty = (key: string): RuleVariable => ({ key, source: VariableSourceEnum.EMPTY });

function rule(name: string, priority: number, variables: RuleVariable[], conditions: SignatureRule['conditions'] = []): SignatureRule {
  return { id: name, name, description: '', priority, active: true, conditions, outputs: { variables } };
}

const empresas: SignatureRule['conditions'] = [{ field: 'company', operator: RuleOperatorEnum.IN, values: ['Sebratel Empresas'] }];

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
    expect(engine.evaluate(person({ phone0800: '08006551000' }), rules, phrases).content.values.telefone_0800).toBe('0800 655 1000');

    const celularNoCampo = engine.evaluate(person({ phone0800: '55996651254' }), rules, phrases);
    expect(celularNoCampo.content.values.telefone_0800).toBe('');
    expect(celularNoCampo.status).toBe(SignatureStatusEnum.PENDING);
    expect(celularNoCampo.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.INVALID_PHONE_0800);

    const vazio = engine.evaluate(person({ phone0800: '' }), rules, phrases);
    expect(vazio.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.MISSING_PHONE_0800);
    expect(vazio.status).toBe(SignatureStatusEnum.PENDING);
  });

  it('variável sem regra mostra o campo de mesmo nome; regra geral põe 0800, frase e contato vazio', () => {
    const result = engine.evaluate(person({}), rules, phrases);
    expect(result.status).toBe(SignatureStatusEnum.READY);
    expect(result.content.values).toMatchObject({
      nome: 'Fulano',
      cargo: 'Analista',
      empresa: 'Sebratel',
      setor: 'Operacional',
      telefone_0800: '0800 655 1000',
      contato: '',
      frase: 'Fico à disposição.',
    });
    expect(result.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([SignatureIssueCodeEnum.ONLY_GENERAL_RULES, SignatureIssueCodeEnum.DEFAULT_PHRASE]),
    );
  });

  it('B2B (Company "Sebratel Empresas", sem ligar para maiúscula/acento): 0800 em texto fixo e celular corporativo', () => {
    const result = engine.evaluate(person({ company: 'SEBRATEL EMPRESAS', corporateMobile: '51988887777' }), rules, phrases);
    expect(result.content.values.telefone_0800).toBe('0800 365 8000');
    expect(result.content.values.contato_celular).toBe('(51) 98888-7777');
    expect(result.decisions.variables.telefone_0800.value).toEqual({
      source: VariableSourceEnum.TEXT,
      field: null,
      prefix: null,
      text: '0800 365 8000',
    });
  });

  it('membro do Suporte mostra "Ramal 4021" e a frase do time; sem ramal no AD fica pendente e o texto some', () => {
    const semRamal = engine.evaluate(person({ team: 'Suporte Técnico' }), rules, phrases);
    expect(semRamal.status).toBe(SignatureStatusEnum.PENDING);
    expect(semRamal.decisions.variables.contato_ramal.ruleName).toBe('Atendimento: ramal');
    expect(semRamal.content.values.contato_ramal).toBe('');
    expect(semRamal.issues.filter((i) => i.code === SignatureIssueCodeEnum.MISSING_EXTENSION)).toHaveLength(1);

    const comRamal = engine.evaluate(person({ team: 'suporte tecnico', extension: '4021' }), rules, phrases);
    expect(comRamal.status).toBe(SignatureStatusEnum.READY);
    expect(comRamal.content.values.contato_ramal).toBe('Ramal 4021');
    expect(comRamal.content.values.frase).toBe('Suporte que resolve.');
  });

  it('gerente mostra a área e o celular informado; o campo usado pede o formulário do celular', () => {
    const gerente = engine.evaluate(person({ level: CollaboratorLevelEnum.MANAGER, informedMobile: '51999990000' }), rules, phrases);
    expect(gerente.content.values.setor).toBe('Técnica');
    expect(gerente.content.values.contato_celular).toBe('(51) 99999-0000');
    expect(gerente.content.fieldsUsed).toContain('celular_informado');

    const semCelular = engine.evaluate(person({ level: CollaboratorLevelEnum.MANAGER }), rules, phrases);
    expect(semCelular.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.MISSING_INFORMED_MOBILE);
  });

  it('qualquer variável do modelo: campo do AD, texto com campo, vazio; vence a prioridade maior, variável por variável', () => {
    const result = engine.evaluate(
      person({ company: 'Sebratel Empresas', corporateMobile: '51988887777', segment: 'Corporativo' }),
      [
        ...rules,
        rule('Empresas p40', 40, [empty('cargo'), field('teste', 'segmento'), empty('frase')], empresas),
        rule('Empresas p50', 50, [text('cargo', '{{cargo}} · {{empresa}}')], empresas),
      ],
      phrases,
    );
    expect(result.status).toBe(SignatureStatusEnum.READY);
    expect(result.content.values).toMatchObject({ cargo: 'Analista · Sebratel Empresas', teste: 'Corporativo', frase: '' });
    expect(result.decisions.variables.cargo.ruleName).toBe('Empresas p50');
    expect(result.decisions.variables.teste.ruleName).toBe('Empresas p40');
    expect(result.phraseOrigin).toMatchObject({ kind: 'NONE' });
  });

  it('campo com prefixo: "Time: Operacional"; sem prefixo sai só o valor; campo vazio não deixa o prefixo sozinho', () => {
    const withPrefix = (key: string, fieldKey: string, prefix: string): RuleVariable => ({ ...field(key, fieldKey), prefix });
    const result = engine.evaluate(
      person({}),
      [
        ...rules,
        rule('Prefixos', 40, [withPrefix('setor', 'time', ' Time: '), field('nome', 'nome'), withPrefix('teste', 'segmento', 'Seg.:')]),
      ],
      phrases,
    );
    expect(result.content.values).toMatchObject({ setor: 'Time: Operacional', nome: 'Fulano', teste: '' });
  });

  it('texto que cita campo vazio deixa a variável vazia; texto da 1.7.0 com {{setor}} continua valendo', () => {
    const result = engine.evaluate(person({}), [...rules, rule('Seg', 40, [text('teste', 'Segmento {{segmento}}')])], phrases);
    expect(result.content.values.teste).toBe('');

    const v17 = RuleOutputsHelper.normalize({ variables: [{ key: 'cargo', mode: 'TEXT', text: '{{cargo}} · {{setor}}' }] });
    const antigo = engine.evaluate(person({}), [...rules, rule('1.7.0', 40, v17.variables ?? [])], phrases);
    expect(antigo.content.values.cargo).toBe('Analista · Operacional');
  });

  it('empate na mesma variável com valores diferentes vira conflito "{{cargo}}"; a de prioridade maior desfaz', () => {
    const tie = [rule('A', 40, [empty('cargo')]), rule('B', 40, [field('cargo', 'departamento')])];
    const result = engine.evaluate(person({}), [...rules, ...tie], phrases);
    expect(result.status).toBe(SignatureStatusEnum.CONFLICT);
    expect(result.conflicts).toEqual([{ slot: 'var:cargo', ruleNames: ['A', 'B'] }]);
    expect(result.issues.find((i) => i.code === SignatureIssueCodeEnum.RULE_CONFLICT)?.message).toContain('{{cargo}}');

    const solved = engine.evaluate(person({}), [...rules, ...tie, rule('C', 41, [field('cargo', 'cargo')])], phrases);
    expect(solved.status).toBe(SignatureStatusEnum.READY);
    expect(solved.conflicts).toEqual([]);
  });

  it('regra inativa não vale e sem nenhuma regra o status é NO_RULE', () => {
    const inactive = rules.map((r) => ({ ...r, active: false }));
    expect(engine.evaluate(person({}), inactive, phrases).status).toBe(SignatureStatusEnum.NO_RULE);
  });

  it('regra gravada no formato antigo (partes fixas) é lida como variáveis e dá o mesmo resultado', () => {
    const legacy = RuleOutputsHelper.normalize({
      phone0800Mode: 'FIXED',
      phone0800: '0800 1',
      contact: 'EXTENSION',
      sectorLabel: 'NONE',
      phraseMode: 'NONE',
    });
    expect(legacy.variables).toEqual(
      expect.arrayContaining([
        { key: 'telefone_0800', source: VariableSourceEnum.TEXT, field: null, text: '0800 1' },
        { key: 'contato_ramal', source: VariableSourceEnum.FIELD, field: 'ramal', prefix: 'Ramal', text: null },
        { key: 'setor', source: VariableSourceEnum.EMPTY, field: null, text: null },
        { key: 'frase', source: VariableSourceEnum.EMPTY, field: null, text: null },
      ]),
    );
    const result = engine.evaluate(person({ extension: '77' }), [rule('Antiga', 0, legacy.variables ?? [])], phrases);
    expect(result.content.values).toMatchObject({ telefone_0800: '0800 1', contato: 'Ramal 77', setor: '', frase: '' });
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
      expect(diretor.content.values.frase).toBe('A rede inteira a gente garante.');
      expect(diretor.phraseOrigin).toEqual({ kind: 'PROFILE', label: 'Direção da Técnica', id: 'pf1' });

      const membro = engine.evaluate(person({ team: 'Suporte Técnico', extension: '4021' }), rules, phrases, profiles);
      expect(membro.phraseOrigin.id).toBe('pf2');
    });

    it('sem perfil: frase do time; sem time: padrão — e a origem diz qual foi', () => {
      const suporte = engine.evaluate(person({ area: 'Comercial', team: 'Suporte Técnico', extension: '1' }), rules, phrases, profiles);
      expect(suporte.phraseOrigin).toMatchObject({ kind: 'TEAM' });
      expect(suporte.content.values.frase).toBe('Suporte que resolve.');
      const outro = engine.evaluate(person({ area: 'Comercial' }), rules, phrases, profiles);
      expect(outro.phraseOrigin.kind).toBe('DEFAULT');
      expect(outro.issues.map((i) => i.code)).toContain(SignatureIssueCodeEnum.DEFAULT_PHRASE);
    });

    it('perfil inativo não vale; regra com frase em texto fixo passa por cima do perfil', () => {
      const inactive = [{ ...direcaoTecnica, active: false }];
      expect(engine.evaluate(person({ level: CollaboratorLevelEnum.DIRECTOR }), rules, phrases, inactive).phraseOrigin.kind).toBe(
        'DEFAULT',
      );

      const diretoria: SignatureRule['conditions'] = [
        { field: 'level', operator: RuleOperatorEnum.IN, values: [CollaboratorLevelEnum.DIRECTOR] },
      ];
      const fixed = rule('Frase fixa da diretoria', 50, [text('frase', 'Fixa.')], diretoria);
      const result = engine.evaluate(person({ level: CollaboratorLevelEnum.DIRECTOR }), [...rules, fixed], phrases, profiles);
      expect(result.content.values.frase).toBe('Fixa.');
      expect(result.phraseOrigin).toMatchObject({ kind: 'FIXED', label: 'Frase fixa da diretoria' });
    });
  });
});
