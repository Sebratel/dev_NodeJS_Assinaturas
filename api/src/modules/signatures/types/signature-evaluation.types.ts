import { VariableSourceEnum } from '../../signature-rules/types/variable-source.enum.js';
import { SignatureIssueCodeEnum } from './signature-issue-code.enum.js';
import { SignatureStatusEnum } from './signature-status.enum.js';

/** Parte decidida por regra: o modelo ou uma variável do modelo (`var:cargo`). */
export type DecisionSlot = 'template' | `var:${string}`;

/** De onde a regra vencedora tirou o valor de uma variável. */
export interface VariableChoice {
  source: VariableSourceEnum;
  field: string | null;
  /** Só em FIELD: texto antes do valor. */
  prefix: string | null;
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
  /** Id do modelo; nulo = modelo padrão. */
  template: SlotDecision<string> | null;
  /** Variável do modelo → regra que decidiu de onde vem o valor. Só as que alguma regra decidiu. */
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

/** Valores prontos para o modelo. */
export interface SignatureContent {
  /** Variável → texto final. Tem todos os campos (pelo nome), os padrões antigos e o que as regras decidiram. */
  values: Record<string, string>;
  /** Campos que as regras puseram em alguma variável (ex.: celular_informado pede o formulário do celular). */
  fieldsUsed: string[];
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
