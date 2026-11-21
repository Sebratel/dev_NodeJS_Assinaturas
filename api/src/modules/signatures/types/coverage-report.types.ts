import { CollaboratorLevelEnum } from '../../directory/types/collaborator-level.enum.js';
import { ContactTypeEnum } from '../../signature-rules/types/contact-type.enum.js';
import { SignatureIssueCodeEnum } from './signature-issue-code.enum.js';
import { SignatureSlot } from './signature-evaluation.types.js';
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
}

export interface RuleSimulation {
  matched: number;
  wins: number;
  sample: PersonSample[];
  before: Record<SignatureStatusEnum, number>;
  after: Record<SignatureStatusEnum, number>;
}
