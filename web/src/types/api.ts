/** Espelho dos contratos da API (api/src/modules/*). */

export type Level =
  | 'DIRECTOR'
  | 'MANAGER'
  | 'COORDINATOR'
  | 'SUPERVISOR'
  | 'LEADER'
  | 'AUXILIARY'
  | 'MEMBER'
export type SignatureStatus = 'READY' | 'PENDING' | 'CONFLICT' | 'NO_RULE'
export type RuleOperator =
  'IN' | 'NOT_IN' | 'CONTAINS' | 'IS_EMPTY' | 'IS_NOT_EMPTY'
export type RuleField =
  | 'area'
  | 'team'
  | 'level'
  | 'title'
  | 'company'
  | 'segment'
  | 'state'
  | 'office'
/** Parte decidida por regra: o modelo ou uma variável do modelo ("var:cargo"). */
export type DecisionSlot = 'template' | `var:${string}`
/** De onde a regra tira o valor da variável: um campo, um texto fixo ou vazio. */
export type VariableSource = 'FIELD' | 'TEXT' | 'EMPTY'
export type IssueCode =
  | 'NO_RULE'
  | 'RULE_CONFLICT'
  | 'MISSING_CORPORATE_MOBILE'
  | 'MISSING_INFORMED_MOBILE'
  | 'MISSING_EXTENSION'
  | 'MISSING_PHONE_0800'
  | 'INVALID_PHONE_0800'
  | 'ONLY_GENERAL_RULES'
  | 'DEFAULT_PHRASE'
export type IssueSeverity = 'ERROR' | 'WARNING' | 'INFO'

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface Collaborator {
  id: string
  login: string
  name: string
  email: string
  title: string
  department: string
  area: string
  team: string
  level: Level
  company: string
  segment: string
  corporateMobile: string
  extension: string
  informedMobile: string
  phone0800: string
  state: string
  office: string
  createdAt: string | null
  changedAt: string | null
}

export interface CollaboratorListItem {
  id: string
  name: string
  email: string
  title: string
  area: string
  team: string
  level: Level
  status: SignatureStatus
  /** Modelo decidido pelas regras; null = modelo padrão. */
  templateId: string | null
  issueCodes: IssueCode[]
}

export interface DirectoryTeam {
  area: string
  team: string
  count: number
}

export interface PhraseImportMatch {
  team: string
  phrase: string
  tooLong: boolean
  confidence: 'EXACT' | 'PROBABLE' | 'NONE'
  best: (DirectoryTeam & { score: number }) | null
  sameNameElsewhere: DirectoryTeam[]
  candidates: Array<DirectoryTeam & { score: number }>
}

export interface CollaboratorFacets {
  areas: string[]
  teams: DirectoryTeam[]
  levels: Level[]
  companies: Array<{ company: string; count: number }>
}

export interface SlotDecision<T> {
  value: T
  ruleId: string
  ruleName: string
  priority: number
}

export type PhraseOriginKind = 'PROFILE' | 'TEAM' | 'DEFAULT' | 'FIXED' | 'NONE'

export interface SignatureEvaluation {
  collaboratorId: string
  status: SignatureStatus
  phraseOrigin: { kind: PhraseOriginKind; label: string; id: string | null }
  matchedRules: Array<{
    id: string
    name: string
    priority: number
    general: boolean
  }>
  decisions: {
    template: SlotDecision<string> | null
    variables: Record<string, SlotDecision<VariableChoice>>
  }
  conflicts: Array<{ slot: DecisionSlot; ruleNames: string[] }>
  issues: Array<{ code: IssueCode; severity: IssueSeverity; message: string }>
  content: {
    /** Variável → texto final (campos pelo nome + o que as regras decidiram). */
    values: Record<string, string>
    /** Campos que as regras puseram em alguma variável. */
    fieldsUsed: string[]
  }
}

export interface VariableChoice {
  source: VariableSource
  field: string | null
  /** Só em FIELD: texto antes do valor ("Time:"). */
  prefix: string | null
  text: string | null
}

export interface CollaboratorSignature {
  collaborator: Collaborator
  evaluation: SignatureEvaluation
  /** `variables`: as que o modelo usa, na ordem em que aparecem. */
  template: { id: string; name: string; fallback: boolean; variables: string[] }
  html: string
  htmlLength: number
  gmailLimit: number
}

export interface RuleCondition {
  field: RuleField
  operator: RuleOperator
  values: string[]
}

/** O modelo e, para cada variável do modelo, de onde vem o valor. Variável fora da lista: a regra não mexe. */
export interface RuleOutputs {
  templateId?: string | null
  variables?: RuleVariable[] | null
}

export interface RuleVariable {
  key: string
  source: VariableSource
  /** Só em FIELD: chave do campo (cargo, celular_corporativo…). */
  field?: string | null
  /** Só em FIELD, opcional: vem antes do valor ("Time:" → "Time: Suporte"). */
  prefix?: string | null
  /** Só em TEXT; pode citar campos: "Ramal {{ramal}}". */
  text?: string | null
}

/** Campo que a regra pode pôr numa variável. A chave também é o nome padrão da variável. */
export interface SignatureField {
  key: string
  label: string
  group: 'AD' | 'SISTEMA'
  description: string
}

/** Campos disponíveis e as variáveis que os modelos usam. */
export interface TemplateVariables {
  fields: SignatureField[]
  variables: Array<{
    key: string
    /** O que a variável mostra quando nenhuma regra decide ("Cargo", "Vazio"). */
    defaultLabel: string
    templates: Array<{ id: string; name: string }>
  }>
}

export interface SignatureRule {
  id: string
  name: string
  description: string
  priority: number
  active: boolean
  conditions: RuleCondition[]
  outputs: RuleOutputs
  createdAt: string
  updatedAt: string
}

export type SignatureRuleInput = Omit<
  SignatureRule,
  'id' | 'createdAt' | 'updatedAt'
>

export interface PersonSample {
  id: string
  name: string
  team: string
  level: Level
}

export type StatusCount = Record<SignatureStatus, number>

export interface CoverageReport {
  generatedAt: string
  totalCollaborators: number
  byStatus: StatusCount
  /** Pessoas por modelo (templateId null = nenhuma regra escolheu: padrão). */
  byTemplate: Array<{ templateId: string | null; count: number }>
  onlyGeneralRules: number
  issues: Array<{
    code: IssueCode
    severity: IssueSeverity
    count: number
    sample: PersonSample[]
  }>
  rules: Array<{
    id: string
    name: string
    priority: number
    active: boolean
    matched: number
    wins: number
  }>
  conflicts: Array<{
    slot: DecisionSlot
    ruleNames: string[]
    count: number
    sample: PersonSample[]
  }>
  groupsOnlyGeneral: Array<{
    area: string
    team: string
    level: Level
    count: number
  }>
  phraseOrigins: Record<PhraseOriginKind, number>
  phraseProfiles: Array<{
    id: string
    name: string
    priority: number
    active: boolean
    matched: number
    wins: number
  }>
}

export interface PhraseProfile {
  id: string
  name: string
  priority: number
  active: boolean
  conditions: RuleCondition[]
  phrase: string
  createdAt: string
  updatedAt: string
}
export type PhraseProfileInput = Pick<
  PhraseProfile,
  'name' | 'priority' | 'active' | 'conditions' | 'phrase'
>

export interface PhraseProfileSimulation {
  matched: number
  wins: number
  overridden: number
  sample: Array<PersonSample & { phraseBefore: string }>
}

export type ApplicationTrigger = 'MANUAL' | 'AUTO_NEW' | 'AUTO_CHANGE'

export interface AutoApplySettings {
  enabled: boolean
  newCollaborators: boolean
  changes: boolean
  includePending: boolean
  maxPerRun: number
  enabledAt: string | null
}

export interface AutoApplyRun {
  at: string
  origin: 'SYNC' | 'MANUAL'
  outcome:
    | 'OFF'
    | 'GOOGLE_NOT_READY'
    | 'NOTHING'
    | 'STARTED'
    | 'WAITING_APPROVAL'
    | 'ERROR'
  message: string
  newcomers: number
  changes: number
  waitingData: number
  retryLater: number
  batchIds: string[]
}

export interface AutomationOverview {
  settings: AutoApplySettings
  running: boolean
  lastRun: AutoApplyRun | null
  pendingApproval: {
    detectedAt: string
    newcomers: number
    changes: number
  } | null
  waitingData: Array<{ id: string; name: string; status: SignatureStatus }>
  checkIntervalMinutes: number
  lastCheckAt: string | null
  nextCheckAt: string | null
  recentDays: number
  recentEntries: Array<{
    id: string
    name: string
    email: string
    team: string
    area: string
    createdAt: string | null
    signatureStatus: SignatureStatus
    received: boolean
    lastWriteAt: string | null
    lastFailureAt: string | null
  }>
  recentApplications: SignatureApplication[]
}

/** Assinatura de uma pessoa como ficaria com a regra do rascunho. */
export interface RulePreview {
  collaboratorId: string
  name: string
  team: string
  title: string
  status: SignatureStatus
  templateName: string
  html: string
  htmlLength: number
  gmailLimit: number
  /** A regra do rascunho pega esta pessoa. */
  matched: boolean
  /** Muda em relação à assinatura de hoje. */
  changed: boolean
  /** Partes que a regra do rascunho decide para esta pessoa. */
  decidedHere: DecisionSlot[]
}

export interface RuleSimulation {
  matched: number
  wins: number
  sample: PersonSample[]
  before: StatusCount
  after: StatusCount
  preview: RulePreview | null
}

export interface DirectoryStatus {
  source: 'SNAPSHOT' | 'LDAP' | 'WINDOWS_LOGIN'
  lastSyncAt: string | null
  lastSyncDurationMs: number | null
  lastError: string | null
  accountsRead: number
  collaborators: number
}

export type SourceField =
  | 'name'
  | 'email'
  | 'title'
  | 'department'
  | 'company'
  | 'segment'
  | 'corporateMobile'
  | 'extension'
  | 'phone0800'
  | 'state'
  | 'office'

export interface Settings {
  'field-sources': Record<SourceField, string>
  'level-synonyms': Array<{ level: Level; words: string[] }>
  'value-aliases': Array<{ field: 'area' | 'team'; from: string; to: string }>
  'team-phrases': {
    defaultPhrase: string
    byTeam: Array<{ area?: string; team: string; phrase: string }>
  }
  'directory-filters': { excludedOuKeywords: string[]; requireEmail: boolean }
  'auto-apply': AutoApplySettings
}
export type SettingKey = keyof Settings

export interface GoogleIntegrationStatus {
  status: 'NOT_CONFIGURED' | 'AUTHORIZED' | 'NOT_AUTHORIZED'
  error: string | null
  projectId: string | null
  clientId: string | null
  keyFilePresent: boolean
  testUser: string | null
  scopes: string[]
  applyEnabled: boolean
}

/** Perfil de acesso: VIEWER só vê; EDITOR edita regras, modelos e frases; MASTER também grava no Gmail. */
export type UserRole = 'MASTER' | 'EDITOR' | 'VIEWER'

/** Quem pode entrar no sistema (tela Usuários). `fixed` = master do AUTH_ADMIN_EMAILS da stack. */
export interface AppUser {
  id: string | null
  email: string
  name: string | null
  role: UserRole
  fixed: boolean
  lastLoginAt: string | null
  createdBy: string | null
  createdAt: string | null
}

export interface SignatureTemplate {
  id: string
  name: string
  description: string
  html: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
export type SignatureTemplateInput = Pick<
  SignatureTemplate,
  'name' | 'description' | 'html' | 'isDefault'
>

export interface TemplatePreview {
  html: string
  htmlLength: number
  gmailLimit: number
  problems: string[]
}

export type ApplicationStatus =
  'APPLIED' | 'UNCHANGED' | 'SKIPPED' | 'FAILED' | 'RESTORED'

export interface ApplicationBatch {
  id: string
  total: number
  processed: number
  counts: Record<ApplicationStatus, number>
  includePending: boolean
  finished: boolean
  startedAt: string
  finishedAt: string | null
  items: Array<{
    collaboratorId: string
    name: string
    email: string
    status: ApplicationStatus
    reason: string
  }>
}

export interface SignatureApplication {
  id: string
  batchId: string
  collaboratorId: string
  collaboratorName: string
  email: string
  sendAsEmail: string | null
  status: ApplicationStatus
  reason: string
  signatureStatus: SignatureStatus | null
  templateId: string | null
  trigger: ApplicationTrigger
  createdAt: string
}

export interface CollaboratorFilterParams {
  search?: string
  area?: string
  team?: string
  level?: Level
  status?: SignatureStatus
}
