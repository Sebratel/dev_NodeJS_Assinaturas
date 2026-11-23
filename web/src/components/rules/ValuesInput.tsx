import { X } from 'lucide-react'
import { useId, useState } from 'react'
import type { Level, RuleField } from '../../types/api'
import { cn } from '../../utils/cn'
import { LEVEL_LABELS } from '../../utils/labels'

interface ValuesInputProps {
  field: RuleField
  values: string[]
  onChange: (values: string[]) => void
  suggestions: string[]
  invalid?: boolean
}

/** Lista de valores da condição. Nível vira botões; os demais campos viram etiquetas com sugestões do AD. */
export function ValuesInput({
  field,
  values,
  onChange,
  suggestions,
  invalid,
}: ValuesInputProps) {
  const listId = useId()
  const [draft, setDraft] = useState('')

  if (field === 'level') {
    return (
      <div className="flex flex-wrap gap-1">
        {(Object.keys(LEVEL_LABELS) as Level[]).map((level) => {
          const on = values.includes(level)
          return (
            <button
              key={level}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(
                  on ? values.filter((v) => v !== level) : [...values, level]
                )
              }
              className={cn(
                'min-h-9 rounded-xl border px-2 text-xs font-medium',
                on
                  ? 'border-primary bg-primary text-neutral-900'
                  : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
              )}
            >
              {LEVEL_LABELS[level]}
            </button>
          )
        })}
      </div>
    )
  }

  const add = (raw: string) => {
    const value = raw.trim()
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase()))
      onChange([...values, value])
    setDraft('')
  }

  return (
    <div
      className={cn(
        'flex min-h-[44px] flex-wrap items-center gap-1 rounded-xl border bg-surface-container-lowest px-1.5 py-1',
        invalid ? 'border-rose-400' : 'border-outline-variant'
      )}
    >
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-0.5 rounded bg-surface-container-low px-1.5 py-0.5 text-xs"
        >
          {value}
          <button
            type="button"
            onClick={() => onChange(values.filter((v) => v !== value))}
            aria-label={`Tirar ${value}`}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(e) => {
          const next = e.target.value
          if (suggestions.includes(next)) add(next)
          else setDraft(next)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          } else if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1))
          }
        }}
        onBlur={() => add(draft)}
        placeholder={values.length ? '' : 'Digite e tecle Enter'}
        className="min-w-28 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-on-surface-variant/60"
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
