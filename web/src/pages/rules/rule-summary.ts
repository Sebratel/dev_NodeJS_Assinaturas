import type { RuleCondition, RuleOutputs } from '../../types/api'
import {
  CONTACT_LABELS,
  FIELD_LABELS,
  LEVEL_LABELS,
  OPERATOR_LABELS,
  PHRASE_MODE_LABELS,
  SECTOR_LABELS,
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

/** Partes que a regra define, em texto curto. `templateNames` traduz o id do modelo. */
export function describeOutputs(
  outputs: RuleOutputs,
  templateNames: Map<string, string> = new Map()
): string[] {
  const parts: string[] = []
  const phoneMode =
    outputs.phone0800Mode ?? (outputs.phone0800 ? 'FIXED' : null)
  if (phoneMode === 'DIRECTORY') parts.push('0800 do AD')
  if (phoneMode === 'FIXED') parts.push(`0800: ${outputs.phone0800 ?? ''}`)
  if (outputs.contact) parts.push(`Contato: ${CONTACT_LABELS[outputs.contact]}`)
  if (outputs.sectorLabel)
    parts.push(`Mostra: ${SECTOR_LABELS[outputs.sectorLabel]}`)
  if (outputs.phraseMode) {
    parts.push(
      outputs.phraseMode === 'FIXED'
        ? `Frase: "${outputs.phraseText ?? ''}"`
        : PHRASE_MODE_LABELS[outputs.phraseMode]
    )
  }
  if (outputs.templateId)
    parts.push(`Modelo: ${templateNames.get(outputs.templateId) ?? 'excluído'}`)
  for (const v of outputs.variables ?? []) {
    parts.push(
      v.mode === 'HIDE'
        ? `Oculta {{${v.key}}}`
        : `{{${v.key}}}: "${v.text ?? ''}"`
    )
  }
  return parts
}
