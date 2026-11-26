import { CollaboratorLevelEnum } from '../../directory/types/collaborator-level.enum.js';
import { SignatureIssueCodeEnum } from './signature-issue-code.enum.js';
import { DecisionSlot, PhraseOriginKind } from './signature-evaluation.types.js';
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
  /** Pessoas por modelo decidido nas regras (null = nenhuma regra escolheu: modelo padrão). */
  byTemplate: Array<{ templateId: string | null; count: number }>;
  onlyGeneralRules: number;
  issues: Array<{ code: SignatureIssueCodeEnum; severity: 'ERROR' | 'WARNING' | 'INFO'; count: number; sample: PersonSample[] }>;
  rules: Array<{ id: string; name: string; priority: number; active: boolean; matched: number; wins: number }>;
  conflicts: Array<{ slot: DecisionSlot; ruleNames: string[]; count: number; sample: PersonSample[] }>;
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
  templateId: string;
  templateName: string;
  html: string;
  /** Mesmo HTML, com cada variável marcada (`data-sig-var`) para a tela mostrar onde ela fica. */
  annotatedHtml: string;
  /** O modelo com o nome de cada variável no lugar ({{cargo}}), blocos abertos, marcado igual. */
  mapHtml: string;
  /** Variáveis do modelo, na ordem em que aparecem. */
  variables: string[];
  /** Valor final de cada variável do modelo para esta pessoa. */
  values: Record<string, string>;
  htmlLength: number;
  gmailLimit: number;
  /** A regra do rascunho pega esta pessoa. */
  matched: boolean;
  /** A assinatura muda em relação à de hoje (com as regras salvas). */
  changed: boolean;
  /** Partes da assinatura desta pessoa que a regra do rascunho decide. */
  decidedHere: DecisionSlot[];
}

export interface RuleSimulation {
  matched: number;
  wins: number;
  sample: PersonSample[];
  before: Record<SignatureStatusEnum, number>;
  after: Record<SignatureStatusEnum, number>;
  preview: RulePreview | null;
}
