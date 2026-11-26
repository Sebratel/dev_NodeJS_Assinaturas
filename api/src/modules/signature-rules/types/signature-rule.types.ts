import { RuleField } from '../../directory/types/collaborator.js';
import { RuleOperatorEnum } from './rule-operator.enum.js';
import { VariableSourceEnum } from './variable-source.enum.js';

/** Condição: o campo do colaborador comparado com a lista (dentro da lista é "OU"). */
export interface RuleCondition {
  field: RuleField;
  operator: RuleOperatorEnum;
  values: string[];
}

/**
 * O que a regra define: o modelo e, para cada variável do modelo, de onde vem o valor.
 * Variável fora da lista = a regra não mexe nela (vale a de prioridade menor ou o padrão).
 */
export interface RuleOutputs {
  /** Modelo de assinatura (signature_templates.id). Nulo = modelo padrão. */
  templateId?: string | null;
  variables?: RuleVariable[] | null;
}

/** Uma variável do modelo ({{cargo}}, {{teste}}…) e de onde a regra tira o valor. */
export interface RuleVariable {
  key: string;
  source: VariableSourceEnum;
  /** Só em FIELD: chave do campo (cargo, celular_corporativo…). */
  field?: string | null;
  /** Em FIELD e TEXT, opcional: vem antes do valor ("Time:" → "Time: Suporte"). Valor vazio = sem prefixo também. */
  prefix?: string | null;
  /** Em FIELD e TEXT, opcional: vem depois do valor ("· Sebratel"). Valor vazio = sem sufixo também. */
  suffix?: string | null;
  /** Só em TEXT. */
  text?: string | null;
}

/** Regra como o motor enxerga (todas as condições precisam casar: "E"). */
export interface SignatureRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  active: boolean;
  conditions: RuleCondition[];
  outputs: RuleOutputs;
}
