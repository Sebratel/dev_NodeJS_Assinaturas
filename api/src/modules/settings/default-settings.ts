import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { SettingKeyEnum } from './types/setting-key.enum.js';
import { SettingsValues } from './types/settings-values.js';

/**
 * Valores iniciais, gravados no banco só na primeira subida. Medidos no AD em 20/11/2026: celular (mobile) e
 * ramal (IP phone) quase vazios; o 0800 vem de General › Telephone number (decisão de 23/11/2026).
 */
export const DEFAULT_SETTINGS: SettingsValues = {
  [SettingKeyEnum.FIELD_SOURCES]: {
    name: 'displayName',
    email: 'mail',
    title: 'title',
    department: 'department',
    company: 'company',
    segment: 'extensionAttribute1',
    corporateMobile: 'mobile',
    extension: 'ipPhone',
    phone0800: 'telephoneNumber',
    state: 'st',
    office: 'physicalDeliveryOfficeName',
  },
  [SettingKeyEnum.LEVEL_SYNONYMS]: [
    { level: CollaboratorLevelEnum.DIRECTOR, words: ['diretor', 'diretora', 'diretor(a)'] },
    { level: CollaboratorLevelEnum.MANAGER, words: ['gerente'] },
    { level: CollaboratorLevelEnum.COORDINATOR, words: ['coordenador', 'coordenadora', 'coordenador(a)'] },
    { level: CollaboratorLevelEnum.SUPERVISOR, words: ['supervisor', 'supervisora', 'supervisor(a)'] },
    { level: CollaboratorLevelEnum.LEADER, words: ['lider', 'líder'] },
    { level: CollaboratorLevelEnum.AUXILIARY, words: ['auxiliar', 'aux', 'aux.'] },
  ],
  [SettingKeyEnum.VALUE_ALIASES]: [
    { field: 'team', from: 'Suporte Tecnico', to: 'Suporte Técnico' },
    { field: 'team', from: 'Inst Fttx', to: 'Instalação Fttx' },
    { field: 'area', from: 'Ti/Infraestrutura', to: 'Ti-Infraestrutura' },
  ],
  [SettingKeyEnum.TEAM_PHRASES]: {
    defaultPhrase: 'Fico à disposição.',
    byTeam: [],
  },
  [SettingKeyEnum.DIRECTORY_FILTERS]: {
    excludedOuKeywords: ['DESATIVADOS', 'Conta de Serviço'],
    requireEmail: true,
  },
  // Começa travado: só a lista de teste (semeada de GOOGLE_APPLY_ALLOWLIST na primeira subida).
  [SettingKeyEnum.APPLY_SCOPE]: { mode: 'LIST', emails: [] },
};
