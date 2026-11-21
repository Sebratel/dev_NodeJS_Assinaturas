import { ContactTypeEnum } from '../../signature-rules/types/contact-type.enum.js';
import { PhraseModeEnum } from '../../signature-rules/types/phrase-mode.enum.js';
import { SectorLabelEnum } from '../../signature-rules/types/sector-label.enum.js';
import { SignatureIssueCodeEnum } from './signature-issue-code.enum.js';
import { SignatureStatusEnum } from './signature-status.enum.js';

export type SignatureSlot = 'phone0800' | 'contact' | 'sectorLabel' | 'phrase';

export interface PhraseChoice {
  mode: PhraseModeEnum;
  text: string | null;
}

/** Qual regra decidiu cada parte (para a tela "por que saiu assim"). */
export interface SlotDecision<T> {
  value: T;
  ruleId: string;
  ruleName: string;
  priority: number;
}

export interface SignatureDecisions {
  phone0800: SlotDecision<string> | null;
  contact: SlotDecision<ContactTypeEnum> | null;
  sectorLabel: SlotDecision<SectorLabelEnum> | null;
  phrase: SlotDecision<PhraseChoice> | null;
}

export interface SignatureIssue {
  code: SignatureIssueCodeEnum;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
}

export interface SignatureConflict {
  slot: SignatureSlot;
  ruleNames: string[];
}

/** Texto final de cada parte da assinatura. */
export interface SignatureContent {
  name: string;
  email: string;
  sectorText: string;
  title: string;
  contactType: ContactTypeEnum;
  contactText: string;
  phrase: string;
  phone0800: string;
}

export interface SignatureEvaluation {
  collaboratorId: string;
  status: SignatureStatusEnum;
  matchedRules: Array<{ id: string; name: string; priority: number; general: boolean }>;
  decisions: SignatureDecisions;
  conflicts: SignatureConflict[];
  issues: SignatureIssue[];
  content: SignatureContent;
}
