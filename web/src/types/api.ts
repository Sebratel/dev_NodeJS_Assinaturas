/** Espelho dos contratos da API (api/src/modules/*). */

export type Level = 'DIRECTOR' | 'MANAGER' | 'COORDINATOR' | 'SUPERVISOR' | 'LEADER' | 'AUXILIARY' | 'MEMBER';
export type SignatureStatus = 'READY' | 'PENDING' | 'CONFLICT' | 'NO_RULE';
export type ContactType = 'NONE' | 'CORPORATE_MOBILE' | 'INFORMED_MOBILE' | 'EXTENSION';
export type SectorLabel = 'AREA' | 'TEAM';
export type PhraseMode = 'TEAM' | 'FIXED' | 'NONE';
export type RuleOperator = 'IN' | 'NOT_IN' | 'CONTAINS' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
export type RuleField = 'area' | 'team' | 'level' | 'title' | 'company' | 'segment' | 'state' | 'office';
export type SignatureSlot = 'phone0800' | 'contact' | 'sectorLabel' | 'phrase';
export type IssueCode =
  | 'NO_RULE'
  | 'RULE_CONFLICT'
  | 'MISSING_CORPORATE_MOBILE'
  | 'MISSING_INFORMED_MOBILE'
  | 'MISSING_EXTENSION'
  | 'MISSING_PHONE_0800'
  | 'ONLY_GENERAL_RULES'
  | 'DEFAULT_PHRASE';
export type IssueSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface Collaborator {
  id: string;
  login: string;
  name: string;
  email: string;
  title: string;
  department: string;
  area: string;
  team: string;
  level: Level;
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

export interface CollaboratorListItem {
  id: string;
  name: string;
  email: string;
  title: string;
  area: string;
  team: string;
  level: Level;
  status: SignatureStatus;
  contactType: ContactType;
  issueCodes: IssueCode[];
}

export interface CollaboratorFacets {
  areas: string[];
  teams: Array<{ area: string; team: string }>;
  levels: Level[];
}

export interface SlotDecision<T> {
  value: T;
  ruleId: string;
  ruleName: string;
  priority: number;
}

export interface SignatureEvaluation {
  collaboratorId: string;
  status: SignatureStatus;
  matchedRules: Array<{ id: string; name: string; priority: number; general: boolean }>;
  decisions: {
    phone0800: SlotDecision<string> | null;
    contact: SlotDecision<ContactType> | null;
    sectorLabel: SlotDecision<SectorLabel> | null;
    phrase: SlotDecision<{ mode: PhraseMode; text: string | null }> | null;
  };
  conflicts: Array<{ slot: SignatureSlot; ruleNames: string[] }>;
  issues: Array<{ code: IssueCode; severity: IssueSeverity; message: string }>;
  content: {
    name: string;
    email: string;
    sectorText: string;
    title: string;
    contactType: ContactType;
    contactText: string;
    phrase: string;
    phone0800: string;
  };
}

export interface CollaboratorSignature {
  collaborator: Collaborator;
  evaluation: SignatureEvaluation;
  html: string;
  htmlLength: number;
  gmailLimit: number;
}

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  values: string[];
}

export interface RuleOutputs {
  phone0800?: string | null;
  contact?: ContactType | null;
  sectorLabel?: SectorLabel | null;
  phraseMode?: PhraseMode | null;
  phraseText?: string | null;
}

export interface SignatureRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  active: boolean;
  conditions: RuleCondition[];
  outputs: RuleOutputs;
  createdAt: string;
  updatedAt: string;
}

export type SignatureRuleInput = Omit<SignatureRule, 'id' | 'createdAt' | 'updatedAt'>;

export interface PersonSample {
  id: string;
  name: string;
  team: string;
  level: Level;
}

export type StatusCount = Record<SignatureStatus, number>;

export interface CoverageReport {
  generatedAt: string;
  totalCollaborators: number;
  byStatus: StatusCount;
  byContact: Record<ContactType, number>;
  onlyGeneralRules: number;
  issues: Array<{ code: IssueCode; severity: IssueSeverity; count: number; sample: PersonSample[] }>;
  rules: Array<{ id: string; name: string; priority: number; active: boolean; matched: number; wins: number }>;
  conflicts: Array<{ slot: SignatureSlot; ruleNames: string[]; count: number; sample: PersonSample[] }>;
  groupsOnlyGeneral: Array<{ area: string; team: string; level: Level; count: number }>;
}

export interface RuleSimulation {
  matched: number;
  wins: number;
  sample: PersonSample[];
  before: StatusCount;
  after: StatusCount;
}

export interface DirectoryStatus {
  source: 'SNAPSHOT' | 'LDAP';
  lastSyncAt: string | null;
  lastSyncDurationMs: number | null;
  lastError: string | null;
  accountsRead: number;
  collaborators: number;
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
  | 'state'
  | 'office';

export interface Settings {
  'field-sources': Record<SourceField, string>;
  'level-synonyms': Array<{ level: Level; words: string[] }>;
  'value-aliases': Array<{ field: 'area' | 'team'; from: string; to: string }>;
  'team-phrases': { defaultPhrase: string; byTeam: Array<{ team: string; phrase: string }> };
  'directory-filters': { excludedOuKeywords: string[]; requireEmail: boolean };
}
export type SettingKey = keyof Settings;

export interface GoogleIntegrationStatus {
  status: 'NOT_CONFIGURED' | 'AWAITING_AUTHORIZATION' | 'AUTHORIZED';
  projectId: string | null;
  clientId: string | null;
  keyFilePresent: boolean;
  scopes: string[];
  applyEnabled: boolean;
}
