import { CollaboratorLevelEnum } from '../../directory/types/collaborator-level.enum.js';
import { SourceField } from '../../directory/types/collaborator.js';
import { SettingKeyEnum } from './setting-key.enum.js';

/** Campo do colaborador → atributo do AD de onde ele vem. */
export type FieldSources = Record<SourceField, string>;

/** Primeira palavra do cargo → nível. Quem não casa com nenhuma vira MEMBER. */
export type LevelSynonyms = Array<{ level: CollaboratorLevelEnum; words: string[] }>;

/** De-para de grafias de área e time ("Suporte Tecnico" → "Suporte Técnico"). */
export type ValueAliases = Array<{ field: 'area' | 'team'; from: string; to: string }>;

/** Frase de um time. Com área, vale só para aquele time daquela área; sem área, para o time em qualquer área. */
export interface TeamPhrase {
  area?: string;
  team: string;
  phrase: string;
}

export interface TeamPhrases {
  defaultPhrase: string;
  byTeam: TeamPhrase[];
}

export interface DirectoryFilters {
  /** Conta fica de fora se o caminho (DN) tiver algum destes trechos. */
  excludedOuKeywords: string[];
  requireEmail: boolean;
}

export interface SettingsValues {
  [SettingKeyEnum.FIELD_SOURCES]: FieldSources;
  [SettingKeyEnum.LEVEL_SYNONYMS]: LevelSynonyms;
  [SettingKeyEnum.VALUE_ALIASES]: ValueAliases;
  [SettingKeyEnum.TEAM_PHRASES]: TeamPhrases;
  [SettingKeyEnum.DIRECTORY_FILTERS]: DirectoryFilters;
}
