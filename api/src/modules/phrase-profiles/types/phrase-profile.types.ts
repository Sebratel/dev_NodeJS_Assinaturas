import type { RuleCondition } from '../../signature-rules/types/signature-rule.types.js';

/**
 * Perfil de frase: "quem tem estas características usa esta frase".
 * Vale quando a regra manda usar a frase "pela tela Frases"; acima da frase do time e da padrão.
 */
export interface PhraseProfile {
  id: string;
  name: string;
  priority: number;
  active: boolean;
  /** Todas precisam casar ("E"); sem condição = vale para todos. */
  conditions: RuleCondition[];
  phrase: string;
}
