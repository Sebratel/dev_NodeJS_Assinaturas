import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { RuleOperatorEnum } from './types/rule-operator.enum.js';
import { RuleVariable, SignatureRule } from './types/signature-rule.types.js';
import { VariableSourceEnum } from './types/variable-source.enum.js';

const field = (key: string, fieldKey: string, prefix: string | null = null): RuleVariable => ({
  key,
  source: VariableSourceEnum.FIELD,
  field: fieldKey,
  prefix,
  text: null,
});
const text = (key: string, value: string): RuleVariable => ({ key, source: VariableSourceEnum.TEXT, field: null, text: value });
const empty = (key: string): RuleVariable => ({ key, source: VariableSourceEnum.EMPTY, field: null, text: null });

/** Contato do modelo padrão: {{contato_celular}} (ícone de WhatsApp) ou {{contato_ramal}}. */
const mobile = (fieldKey: string): RuleVariable[] => [
  field('contato', fieldKey),
  field('contato_celular', fieldKey),
  empty('contato_ramal'),
];

/**
 * Regras do pedido de 20/11/2026, gravadas só na primeira subida (banco vazio).
 * O B2B é quem tem Company "Sebratel Empresas" no AD (decisão de 23/11/2026); até alguém ter esse valor, pega ninguém.
 */
export const DEFAULT_SIGNATURE_RULES: Array<Omit<SignatureRule, 'id'>> = [
  {
    name: 'Geral: 0800 e frase do time',
    description: 'Vale para todos: 0800 do AD (Telephone number). As regras de prioridade maior trocam só o que definirem.',
    priority: 0,
    active: true,
    conditions: [],
    outputs: {
      variables: [
        field('telefone_0800', 'telefone_0800'),
        empty('contato'),
        empty('contato_celular'),
        empty('contato_ramal'),
        field('setor', 'time'),
        field('frase', 'frase'),
      ],
    },
  },
  {
    name: 'B2B: 0800 e celular da empresa',
    description: 'B2B = Company "Sebratel Empresas" no AD. Usa o 0800 próprio e mostra o celular corporativo.',
    priority: 10,
    active: true,
    conditions: [{ field: 'company', operator: RuleOperatorEnum.IN, values: ['Sebratel Empresas'] }],
    outputs: { variables: [text('telefone_0800', '0800 365 8000'), ...mobile('celular_corporativo'), field('setor', 'time')] },
  },
  {
    name: 'Direção e Gerência',
    description: 'Celular digitado pela própria pessoa; mostra a área.',
    priority: 20,
    active: true,
    conditions: [
      { field: 'level', operator: RuleOperatorEnum.IN, values: [CollaboratorLevelEnum.DIRECTOR, CollaboratorLevelEnum.MANAGER] },
    ],
    outputs: { variables: [...mobile('celular_informado'), field('setor', 'area')] },
  },
  {
    name: 'Coordenação, Supervisão e Auxiliar',
    description: 'Celular da empresa já carregado; mostra o time.',
    priority: 20,
    active: true,
    conditions: [
      {
        field: 'level',
        operator: RuleOperatorEnum.IN,
        values: [CollaboratorLevelEnum.COORDINATOR, CollaboratorLevelEnum.SUPERVISOR, CollaboratorLevelEnum.AUXILIARY],
      },
    ],
    outputs: { variables: [...mobile('celular_corporativo'), field('setor', 'time')] },
  },
  {
    name: 'Time DHO',
    description: 'Celular da empresa já carregado; mostra o time.',
    priority: 20,
    active: true,
    conditions: [{ field: 'team', operator: RuleOperatorEnum.IN, values: ['Dho'] }],
    outputs: { variables: [...mobile('celular_corporativo'), field('setor', 'time')] },
  },
  {
    name: 'Atendimento: ramal',
    description: 'Membros de Suporte, Financeiro (Atendimento) e Vendas Interno mostram o ramal.',
    priority: 30,
    active: true,
    conditions: [
      { field: 'team', operator: RuleOperatorEnum.IN, values: ['Suporte Técnico', 'Atendimento', 'Vendas Interno'] },
      { field: 'level', operator: RuleOperatorEnum.IN, values: [CollaboratorLevelEnum.MEMBER] },
    ],
    outputs: {
      variables: [
        field('contato', 'ramal', 'Ramal'),
        empty('contato_celular'),
        field('contato_ramal', 'ramal', 'Ramal'),
        field('setor', 'time'),
      ],
    },
  },
];
