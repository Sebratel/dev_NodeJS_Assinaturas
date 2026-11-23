import { Plus, Trash2 } from 'lucide-react'
import { useConditionSuggestions } from '../../hooks/useConditionSuggestions'
import type { RuleCondition, RuleField, RuleOperator } from '../../types/api'
import { FIELD_LABELS, OPERATOR_LABELS } from '../../utils/labels'
import { Button } from '../ui/Button'
import { Select } from '../ui/Input'
import { ValuesInput } from './ValuesInput'

const VALUELESS: RuleOperator[] = ['IS_EMPTY', 'IS_NOT_EMPTY']

interface ConditionsEditorProps {
  conditions: RuleCondition[]
  onChange: (conditions: RuleCondition[]) => void
  /** Erro por condição (índice → mensagem). */
  errors?: Record<number, string | undefined>
  emptyHint?: string
}

/** "Quando": lista de condições ligadas por "e"; os valores de cada uma são "ou". Usado em regras e perfis de frase. */
export function ConditionsEditor({
  conditions,
  onChange,
  errors = {},
  emptyHint = 'Sem condição: vale para todos os colaboradores.',
}: ConditionsEditorProps) {
  const suggestionsFor = useConditionSuggestions()
  const update = (index: number, change: Partial<RuleCondition>) =>
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...change } : c)))

  return (
    <section className="grid gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Quando</h3>
        <Button
          size="sm"
          icon={<Plus className="size-3.5" />}
          onClick={() =>
            onChange([
              ...conditions,
              { field: 'team', operator: 'IN', values: [] },
            ])
          }
        >
          Condição
        </Button>
      </div>
      {conditions.length === 0 && (
        <p className="text-xs text-on-surface-variant">{emptyHint}</p>
      )}
      {conditions.map((condition, index) => (
        <div
          key={index}
          className="grid gap-1.5 border-t border-outline-variant pt-2 first-of-type:border-t-0 first-of-type:pt-0"
        >
          {index > 0 && (
            <span className="text-[11px] font-medium text-on-surface-variant">
              e
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Select
              aria-label="Campo"
              className="w-auto min-w-28"
              value={condition.field}
              onChange={(e) =>
                update(index, {
                  field: e.target.value as RuleField,
                  values: [],
                })
              }
            >
              {(Object.keys(FIELD_LABELS) as RuleField[]).map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Operador"
              className="w-auto min-w-32"
              value={condition.operator}
              onChange={(e) =>
                update(index, { operator: e.target.value as RuleOperator })
              }
            >
              {(Object.keys(OPERATOR_LABELS) as RuleOperator[]).map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              ))}
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onChange(conditions.filter((_, i) => i !== index))}
              aria-label="Tirar condição"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          {!VALUELESS.includes(condition.operator) && (
            <ValuesInput
              field={condition.field}
              values={condition.values}
              onChange={(values) => update(index, { values })}
              suggestions={suggestionsFor(condition.field)}
              invalid={Boolean(errors[index])}
            />
          )}
          {errors[index] && (
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {errors[index]}
            </p>
          )}
        </div>
      ))}
    </section>
  )
}
