import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { ContactTypeEnum } from './types/contact-type.enum.js';
import { Phone0800ModeEnum } from './types/phone0800-mode.enum.js';
import { PhraseModeEnum } from './types/phrase-mode.enum.js';
import { RuleOperatorEnum } from './types/rule-operator.enum.js';
import { SectorLabelEnum } from './types/sector-label.enum.js';
import { SignatureRule } from './types/signature-rule.types.js';

/**
 * Regras do pedido de 20/11/2026, gravadas só na primeira subida (banco vazio).
 * O B2B depende do campo de segmento no AD (hoje vazio), por isso começa pegando ninguém.
 */
export const DEFAULT_SIGNATURE_RULES: Array<Omit<SignatureRule, 'id'>> = [
  {
    name: 'Geral: 0800 e frase do time',
    description: 'Vale para todos: 0800 do AD (Telephone number). As regras de prioridade maior trocam só o que definirem.',
    priority: 0,
    active: true,
    conditions: [],
    outputs: {
      phone0800Mode: Phone0800ModeEnum.DIRECTORY,
      contact: ContactTypeEnum.NONE,
      sectorLabel: SectorLabelEnum.TEAM,
      phraseMode: PhraseModeEnum.TEAM,
    },
  },
  {
    name: 'B2B: 0800 e celular da empresa',
    description: 'Segmento B2B usa o 0800 próprio e mostra o celular corporativo.',
    priority: 10,
    active: true,
    conditions: [{ field: 'segment', operator: RuleOperatorEnum.IN, values: ['B2B'] }],
    outputs: {
      phone0800Mode: Phone0800ModeEnum.FIXED,
      phone0800: '0800 365 8000',
      contact: ContactTypeEnum.CORPORATE_MOBILE,
      sectorLabel: SectorLabelEnum.TEAM,
    },
  },
  {
    name: 'Direção e Gerência',
    description: 'Celular digitado pela própria pessoa; mostra a área.',
    priority: 20,
    active: true,
    conditions: [
      { field: 'level', operator: RuleOperatorEnum.IN, values: [CollaboratorLevelEnum.DIRECTOR, CollaboratorLevelEnum.MANAGER] },
    ],
    outputs: { contact: ContactTypeEnum.INFORMED_MOBILE, sectorLabel: SectorLabelEnum.AREA },
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
    outputs: { contact: ContactTypeEnum.CORPORATE_MOBILE, sectorLabel: SectorLabelEnum.TEAM },
  },
  {
    name: 'Time DHO',
    description: 'Celular da empresa já carregado; mostra o time.',
    priority: 20,
    active: true,
    conditions: [{ field: 'team', operator: RuleOperatorEnum.IN, values: ['Dho'] }],
    outputs: { contact: ContactTypeEnum.CORPORATE_MOBILE, sectorLabel: SectorLabelEnum.TEAM },
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
    outputs: { contact: ContactTypeEnum.EXTENSION, sectorLabel: SectorLabelEnum.TEAM },
  },
];
