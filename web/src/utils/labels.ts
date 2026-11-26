import type { BadgeTone } from '../components/ui/Badge'
import type {
  ContactType,
  DecisionSlot,
  IssueCode,
  Level,
  PhraseMode,
  RuleField,
  RuleOperator,
  SectorLabel,
  SignatureSlot,
  SignatureStatus,
  SourceField,
  VariableMode,
} from '../types/api'

export const LEVEL_LABELS: Record<Level, string> = {
  DIRECTOR: 'Direção',
  MANAGER: 'Gerência',
  COORDINATOR: 'Coordenação',
  SUPERVISOR: 'Supervisão',
  LEADER: 'Liderança',
  AUXILIARY: 'Auxiliar',
  MEMBER: 'Membro de time',
}

export const STATUS_LABELS: Record<SignatureStatus, string> = {
  READY: 'Pronta',
  PENDING: 'Pendente',
  CONFLICT: 'Conflito',
  NO_RULE: 'Sem regra',
}

export const STATUS_TONES: Record<SignatureStatus, BadgeTone> = {
  READY: 'success',
  PENDING: 'warning',
  CONFLICT: 'danger',
  NO_RULE: 'neutral',
}

export const CONTACT_LABELS: Record<ContactType, string> = {
  NONE: 'Sem contato',
  CORPORATE_MOBILE: 'Celular corporativo',
  INFORMED_MOBILE: 'Celular informado',
  EXTENSION: 'Ramal',
}

export const SECTOR_LABELS: Record<SectorLabel, string> = {
  AREA: 'Área',
  TEAM: 'Time',
  NONE: 'Nada (só o cargo)',
}

export const PHONE0800_MODE_LABELS = {
  DIRECTORY: 'Do AD (Telephone number)',
  FIXED: 'Número fixo',
} as const

export const PHRASE_MODE_LABELS: Record<PhraseMode, string> = {
  TEAM: 'Pela tela Frases',
  FIXED: 'Frase fixa',
  NONE: 'Sem frase',
}

export const PHRASE_ORIGIN_LABELS: Record<
  import('../types/api').PhraseOriginKind,
  string
> = {
  PROFILE: 'Perfil de frase',
  TEAM: 'Frase do time',
  DEFAULT: 'Frase padrão',
  FIXED: 'Frase fixa da regra',
  NONE: 'Sem frase',
}

export const TRIGGER_LABELS: Record<
  import('../types/api').ApplicationTrigger,
  string
> = {
  MANUAL: 'Manual',
  AUTO_NEW: 'Automática · novo no AD',
  AUTO_CHANGE: 'Automática · mudou',
}

export const FIELD_LABELS: Record<RuleField, string> = {
  area: 'Área',
  team: 'Time',
  level: 'Nível',
  title: 'Cargo',
  company: 'Empresa',
  segment: 'Segmento',
  state: 'UF',
  office: 'Escritório',
}

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  IN: 'é um de',
  NOT_IN: 'não é um de',
  CONTAINS: 'contém',
  IS_EMPTY: 'está vazio',
  IS_NOT_EMPTY: 'está preenchido',
}

export const SLOT_LABELS: Record<SignatureSlot, string> = {
  phone0800: '0800',
  contact: 'Contato',
  sectorLabel: 'Área ou time',
  phrase: 'Frase',
  template: 'Modelo',
}

/** "Frase", "Modelo"… ou "{{cargo}}" para variável do modelo. */
export function slotLabel(slot: DecisionSlot): string {
  return slot.startsWith('var:')
    ? `{{${slot.slice(4)}}}`
    : SLOT_LABELS[slot as SignatureSlot]
}

export const VARIABLE_MODE_LABELS: Record<VariableMode, string> = {
  HIDE: 'Ocultar',
  TEXT: 'Trocar por',
}

export const APPLICATION_STATUS_LABELS: Record<
  import('../types/api').ApplicationStatus,
  string
> = {
  APPLIED: 'Gravada',
  UNCHANGED: 'Já estava igual',
  SKIPPED: 'Pulada',
  FAILED: 'Falhou',
  RESTORED: 'Desfeita',
}

export const ISSUE_LABELS: Record<IssueCode, string> = {
  NO_RULE: 'Nenhuma regra vale',
  RULE_CONFLICT: 'Regras em conflito',
  MISSING_CORPORATE_MOBILE: 'Sem celular corporativo no AD',
  MISSING_INFORMED_MOBILE: 'Aguardando celular da pessoa',
  MISSING_EXTENSION: 'Sem ramal no AD',
  MISSING_PHONE_0800: 'Sem 0800',
  INVALID_PHONE_0800: '0800 errado no AD',
  ONLY_GENERAL_RULES: 'Só a regra geral vale',
  DEFAULT_PHRASE: 'Usa a frase padrão',
}

export const SOURCE_FIELD_LABELS: Record<
  SourceField,
  { label: string; hint: string }
> = {
  name: { label: 'Nome', hint: 'nome de exibição' },
  email: { label: 'E-mail', hint: 'endereço do Gmail' },
  title: { label: 'Cargo', hint: 'define o nível pela 1ª palavra' },
  department: { label: 'Departamento', hint: '"Grupo Área - Time"' },
  company: { label: 'Empresa', hint: '' },
  segment: { label: 'Segmento (B2B)', hint: 'campo a criar no AD' },
  corporateMobile: {
    label: 'Celular corporativo',
    hint: 'Telefones › Celular',
  },
  extension: { label: 'Ramal', hint: 'Telefones › IP phone' },
  phone0800: { label: '0800', hint: 'Geral › Telephone number' },
  state: { label: 'UF', hint: '' },
  office: { label: 'Escritório', hint: '' },
}
