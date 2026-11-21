import type { RuleCondition, RuleOutputs } from '../../types/api';
import { CONTACT_LABELS, FIELD_LABELS, LEVEL_LABELS, OPERATOR_LABELS, PHRASE_MODE_LABELS, SECTOR_LABELS } from '../../utils/labels';

/** "Nível é um de Direção, Gerência" — texto curto da condição para a lista de regras. */
export function describeCondition(condition: RuleCondition): string {
  const values =
    condition.field === 'level'
      ? condition.values.map((v) => LEVEL_LABELS[v as keyof typeof LEVEL_LABELS] ?? v)
      : condition.values;
  const tail = values.length ? ` ${values.join(', ')}` : '';
  return `${FIELD_LABELS[condition.field]} ${OPERATOR_LABELS[condition.operator]}${tail}`;
}

export function describeOutputs(outputs: RuleOutputs): string[] {
  const parts: string[] = [];
  if (outputs.phone0800) parts.push(`0800: ${outputs.phone0800}`);
  if (outputs.contact) parts.push(`Contato: ${CONTACT_LABELS[outputs.contact]}`);
  if (outputs.sectorLabel) parts.push(`Mostra: ${SECTOR_LABELS[outputs.sectorLabel]}`);
  if (outputs.phraseMode) {
    parts.push(outputs.phraseMode === 'FIXED' ? `Frase: "${outputs.phraseText ?? ''}"` : PHRASE_MODE_LABELS[outputs.phraseMode]);
  }
  return parts;
}
