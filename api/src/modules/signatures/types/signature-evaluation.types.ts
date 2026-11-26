import { ContactTypeEnum } from '../../signature-rules/types/contact-type.enum.js';
import { Phone0800ModeEnum } from '../../signature-rules/types/phone0800-mode.enum.js';
import { PhraseModeEnum } from '../../signature-rules/types/phrase-mode.enum.js';
import { SectorLabelEnum } from '../../signature-rules/types/sector-label.enum.js';
import { VariableModeEnum } from '../../signature-rules/types/variable-mode.enum.js';
import { SignatureIssueCodeEnum } from './signature-issue-code.enum.js';
import { SignatureStatusEnum } from './signature-status.enum.js';

export type SignatureSlot = 'phone0800' | 'contact' | 'sectorLabel' | 'phrase' | 'template';

/** Parte decidida por regra: uma das fixas ou uma variável do modelo (`var:cargo`). */
export type DecisionSlot = SignatureSlot | `var:${string}`;

export interface VariableChoice {
  mode: VariableModeEnum;
  text: string | null;
}

export interface Phone0800Choice {
  mode: Phone0800ModeEnum;
  text: string | null;
}

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
  phone0800: SlotDecision<Phone0800Choice> | null;
  contact: SlotDecision<ContactTypeEnum> | null;
  sectorLabel: SlotDecision<SectorLabelEnum> | null;
  phrase: SlotDecision<PhraseChoice> | null;
  /** Id do modelo; nulo = modelo padrão. */
  template: SlotDecision<string> | null;
  /** Variável do modelo → regra que a escondeu ou trocou. Só as que alguma regra decidiu. */
  variables: Record<string, SlotDecision<VariableChoice>>;
}

export interface SignatureIssue {
  code: SignatureIssueCodeEnum;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
}

export interface SignatureConflict {
  slot: DecisionSlot;
  ruleNames: string[];
}

/** Texto final de cada parte da assinatura. */
export interface SignatureContent {
  name: string;
  email: string;
  sectorText: string;
  area: string;
  team: string;
  title: string;
  contactType: ContactTypeEnum;
  contactText: string;
  phrase: string;
  phone0800: string;
  company: string;
  department: string;
  segment: string;
  state: string;
  office: string;
  /** Variáveis que as regras esconderam ou trocaram; aplicadas por último na renderização. */
  overrides: Record<string, VariableChoice>;
}

/** De onde saiu a frase: perfil da tela Frases, frase do time, padrão, frase fixa de uma regra ou nenhuma. */
export type PhraseOriginKind = 'PROFILE' | 'TEAM' | 'DEFAULT' | 'FIXED' | 'NONE';

export interface PhraseOrigin {
  kind: PhraseOriginKind;
  /** Nome do perfil, "Time · Área", "Frase padrão" ou o nome da regra. */
  label: string;
  /** Id do perfil quando kind = PROFILE. */
  id: string | null;
}

export interface SignatureEvaluation {
  collaboratorId: string;
  status: SignatureStatusEnum;
  phraseOrigin: PhraseOrigin;
  matchedRules: Array<{ id: string; name: string; priority: number; general: boolean }>;
  decisions: SignatureDecisions;
  conflicts: SignatureConflict[];
  issues: SignatureIssue[];
  content: SignatureContent;
}
