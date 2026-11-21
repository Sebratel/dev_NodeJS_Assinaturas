import { CollaboratorLevelEnum } from './collaborator-level.enum.js';

/** Registro bruto do diretório: atributo do AD → valor (string). Igual para LDAP e snapshot. */
export type RawDirectoryEntry = Record<string, string | null | undefined>;

/** Colaborador já traduzido para os campos que as regras usam. */
export interface Collaborator {
  id: string;
  login: string;
  name: string;
  email: string;
  title: string;
  department: string;
  area: string;
  team: string;
  level: CollaboratorLevelEnum;
  company: string;
  segment: string;
  corporateMobile: string;
  extension: string;
  informedMobile: string;
  state: string;
  office: string;
  createdAt: string | null;
  changedAt: string | null;
}

/** Campos do colaborador que podem vir de um atributo configurável do AD. */
export const SOURCE_FIELDS = [
  'name',
  'email',
  'title',
  'department',
  'company',
  'segment',
  'corporateMobile',
  'extension',
  'state',
  'office',
] as const;
export type SourceField = (typeof SOURCE_FIELDS)[number];

/** Campos que as condições das regras podem testar. */
export const RULE_FIELDS = ['area', 'team', 'level', 'title', 'company', 'segment', 'state', 'office'] as const;
export type RuleField = (typeof RULE_FIELDS)[number];
