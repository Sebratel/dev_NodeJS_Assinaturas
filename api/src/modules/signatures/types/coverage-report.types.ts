import { CollaboratorLevelEnum } from '../../directory/types/collaborator-level.enum.js';
import { ContactTypeEnum } from '../../signature-rules/types/contact-type.enum.js';
import { SignatureIssueCodeEnum } from './signature-issue-code.enum.js';
import { PhraseOriginKind, SignatureSlot } from './signature-evaluation.types.js';
import { SignatureStatusEnum } from './signature-status.enum.js';

export interface PersonSample {
  id: string;
  name: string;
  team: string;
  level: CollaboratorLevelEnum;
}

export interface CoverageReport {
  generatedAt: string;
  totalCollaborators: number;
  byStatus: Record<SignatureStatusEnum, number>;
  byContact: Record<ContactTypeEnum, number>;
  onlyGeneralRules: number;
  issues: Array<{ code: SignatureIssueCodeEnum; severity: 'ERROR' | 'WARNING' | 'INFO'; count: number; sample: PersonSample[] }>;
  rules: Array<{ id: string; name: string; priority: number; active: boolean; matched: number; wins: number }>;
  conflicts: Array<{ slot: SignatureSlot; ruleNames: string[]; count: number; sample: PersonSample[] }>;
  /** Grupos (área · time · nível) que só a regra geral pega: candidatos a regra nova. */
  groupsOnlyGeneral: Array<{ area: string; team: string; level: CollaboratorLevelEnum; count: number }>;
  /** De onde saiu a frase de cada pessoa. */
  phraseOrigins: Record<PhraseOriginKind, number>;
  /** Perfis de frase: quantos casam e de quantos decidem a frase. */
  phraseProfiles: Array<{ id: string; name: string; priority: number; active: boolean; matched: number; wins: number }>;
}

export interface PhraseProfileSimulation {
  matched: number;
  wins: number;
  overridden: number;
  sample: Array<PersonSample & { phraseBefore: string }>;
}

/** Assinatura de uma pessoa como ficaria com a regra do rascunho (prévia no editor de regra). */
export interface RulePreview {
  collaboratorId: string;
  name: string;
  team: string;
  title: string;
  status: SignatureStatusEnum;
  templateName: string;
  html: string;
  htmlLength: number;
  gmailLimit: number;
  /** A regra do rascunho pega esta pessoa. */
  matched: boolean;
  /** A assinatura muda em relação à de hoje (com as regras salvas). */
  changed: boolean;
  /** Partes da assinatura desta pessoa que a regra do rascunho decide. */
  decidedHere: string[];
}

export interface RuleSimulation {
  matched: number;
  wins: number;
  sample: PersonSample[];
  before: Record<SignatureStatusEnum, number>;
  after: Record<SignatureStatusEnum, number>;
  preview: RulePreview | null;
}
