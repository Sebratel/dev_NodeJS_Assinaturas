import type { RuleCondition, RuleOutputs } from '../../types/api'
import {
  choiceLabel,
  FIELD_LABELS,
  LEVEL_LABELS,
  OPERATOR_LABELS,
} from '../../utils/labels'

/** "Nível é um de Direção, Gerência" — texto curto da condição para a lista de regras. */
export function describeCondition(condition: RuleCondition): string {
  const values =
    condition.field === 'level'
      ? condition.values.map(
          (v) => LEVEL_LABELS[v as keyof typeof LEVEL_LABELS] ?? v
        )
      : condition.values
  const tail = values.length ? ` ${values.join(', ')}` : ''
  return `${FIELD_LABELS[condition.field]} ${OPERATOR_LABELS[condition.operator]}${tail}`
}

/**
 * O que a regra define, em texto curto: "Modelo: Sebratel Empresas", "{{cargo}}: Vazio", "{{contato}}: Celular corporativo".
 * `templateNames` traduz o id do modelo; `fieldLabels`, a chave do campo.
 */
export function describeOutputs(
  outputs: RuleOutputs,
  templateNames: Map<string, string> = new Map(),
  fieldLabels: Map<string, string> = new Map()
): string[] {
  const parts: string[] = []
  if (outputs.templateId)
    parts.push(`Modelo: ${templateNames.get(outputs.templateId) ?? 'excluído'}`)
  for (const v of outputs.variables ?? []) {
    parts.push(`{{${v.key}}}: ${choiceLabel(v, fieldLabels)}`)
  }
  return parts
}
