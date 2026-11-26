import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTemplateVariables } from '../../hooks/useTemplateVariables'
import type {
  VariableChoiceValue,
  VariableFormValue,
} from '../../pages/rules/rule-form'
import { cn } from '../../utils/cn'
import { Input, Select } from '../ui/Input'

const EMPTY_VALUE: VariableFormValue = {
  choice: '',
  text: '',
  prefix: '',
  suffix: '',
}

interface VariablesEditorProps {
  value: Record<string, VariableFormValue>
  onChange: (next: Record<string, VariableFormValue>) => void
  /** Variáveis do modelo mostrado ao lado, na ordem em que aparecem (dá o número de cada uma). */
  ordered: string[]
  /** Valor final de cada variável para a pessoa da prévia (null enquanto não há prévia). */
  previewValues: Record<string, string> | null
  /** Variável em foco (linha com o mouse/foco ou marca da assinatura). */
  activeVar: string | null
  onActive: (key: string | null) => void
  /** Pedido para rolar até a linha e focar o seletor (clique na assinatura). */
  focus: { key: string; at: number } | null
  /** Erro por variável. */
  errors?: Record<string, string | undefined>
}

/**
 * Uma linha por variável, na ordem em que aparece no modelo, com o mesmo número das marcas da assinatura.
 * Cada linha: Valor (não muda, vazio, texto fixo ou um campo), Prefixo e Sufixo.
 */
export function VariablesEditor({
  value,
  onChange,
  ordered,
  previewValues,
  activeVar,
  onActive,
  focus,
  errors = {},
}: VariablesEditorProps) {
  const info = useTemplateVariables()
  const [showOthers, setShowOthers] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const fields = info.data?.fields ?? []
  const byKey = new Map((info.data?.variables ?? []).map((v) => [v.key, v]))

  const inModel = new Set(ordered)
  const others = (info.data?.variables ?? [])
    .map((v) => v.key)
    .filter((key) => !inModel.has(key))
  // Variável que a regra define mas nenhum modelo usa mais: continua visível para poder tirar.
  const orphans = Object.keys(value).filter(
    (key) => value[key]?.choice && !inModel.has(key) && !byKey.has(key)
  )
  const othersDefined = others.filter((key) => value[key]?.choice)
  const othersShown = showOthers ? others : othersDefined

  const touch = (key: string) =>
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  const set = (key: string, change: Partial<VariableFormValue>) =>
    onChange({ ...value, [key]: { ...(value[key] ?? EMPTY_VALUE), ...change } })

  // Clique numa marca da assinatura: rola até a linha e foca o seletor (as marcas são do modelo ao lado,
  // então a linha está sempre na lista principal).
  useEffect(() => {
    if (!focus) return
    const row = rowRefs.current.get(focus.key)
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    row?.querySelector('select')?.focus({ preventScroll: true })
  }, [focus])

  const renderRow = (key: string, number: number | null) => {
    const current = value[key] ?? EMPTY_VALUE
    const meta = byKey.get(key)
    const decided = Boolean(current.choice)
    const hasValue =
      current.choice === 'TEXT' || current.choice.startsWith('FIELD:')
    // Prefixo/sufixo numa linha em "Não muda": assume o campo padrão da variável ({{nome}} → Nome).
    const affixOpen =
      hasValue || (!current.choice && Boolean(meta?.defaultField))
    const setAffix = (
      change:
        Pick<VariableFormValue, 'prefix'> | Pick<VariableFormValue, 'suffix'>
    ) =>
      set(
        key,
        !current.choice && meta?.defaultField
          ? { ...change, choice: `FIELD:${meta.defaultField}` }
          : change
      )
    const error =
      errors[key] ??
      (current.choice === 'TEXT' && !current.text.trim() && touched.has(key)
        ? 'Escreva o texto ou escolha Vazio.'
        : undefined)
    const shown = previewValues ? (previewValues[key] ?? null) : null
    const active = activeVar === key

    return (
      <div
        key={key}
        ref={(el) => {
          if (el) rowRefs.current.set(key, el)
          else rowRefs.current.delete(key)
        }}
        onMouseEnter={() => onActive(key)}
        onMouseLeave={() => onActive(null)}
        onFocus={() => onActive(key)}
        className={cn(
          'grid scroll-mt-24 grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 rounded-lg px-1.5 py-2 transition md:grid-cols-[1.5rem_9.5rem_minmax(0,1fr)_6.5rem_6.5rem] md:items-start',
          active
            ? 'bg-primary/10 ring-1 ring-primary/40'
            : 'hover:bg-surface-container-low'
        )}
      >
        <span
          className={cn(
            'mt-2 grid size-5 place-items-center rounded-full text-[10px] font-bold',
            number
              ? active
                ? 'bg-primary-ink text-white'
                : 'bg-surface-container-low text-on-surface-variant'
              : 'text-on-surface-variant'
          )}
          title={
            number ? `Posição ${number} no modelo` : 'Fora do modelo ao lado'
          }
        >
          {number ?? '–'}
        </span>
        <div className="min-w-0 pt-1">
          <code
            className={cn(
              'block truncate font-mono text-[13px]',
              decided
                ? 'font-semibold text-on-surface'
                : 'text-on-surface-variant'
            )}
            title={
              meta
                ? `Usada em: ${meta.templates.map((t) => t.name).join(', ')}`
                : 'Nenhum modelo usa mais esta variável'
            }
          >
            {`{{${key}}}`}
          </code>
          {previewValues && (
            <span
              className="block truncate text-[11px] text-on-surface-variant"
              title={shown || undefined}
            >
              {shown ? `→ ${shown}` : '→ vazia'}
            </span>
          )}
        </div>
        <div className="col-span-2 grid gap-1 md:col-span-1">
          <Select
            aria-label={`Valor de {{${key}}}`}
            className="min-h-9 py-1.5"
            value={current.choice}
            onChange={(e) =>
              set(key, { choice: e.target.value as VariableChoiceValue })
            }
          >
            <option value="">
              {`Não muda (padrão: ${meta?.defaultLabel ?? 'Vazio'})`}
            </option>
            <option value="EMPTY">Vazio (em branco)</option>
            <option value="TEXT">Texto fixo…</option>
            <optgroup label="Campos do AD">
              {fields
                .filter((f) => f.group === 'AD')
                .map((f) => (
                  <option key={f.key} value={`FIELD:${f.key}`}>
                    {f.label}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Do sistema">
              {fields
                .filter((f) => f.group === 'SISTEMA')
                .map((f) => (
                  <option key={f.key} value={`FIELD:${f.key}`}>
                    {f.label}
                  </option>
                ))}
            </optgroup>
          </Select>
          {current.choice === 'TEXT' && (
            <Input
              aria-label={`Texto de {{${key}}}`}
              className="min-h-9 py-1.5"
              maxLength={200}
              value={current.text}
              onChange={(e) => {
                set(key, { text: e.target.value })
                if (!e.target.value.trim()) touch(key)
              }}
              onBlur={() => touch(key)}
              placeholder="Ex.: 0800 365 8000 ou Ramal {{ramal}}"
              aria-invalid={Boolean(error)}
            />
          )}
        </div>
        {(['prefix', 'suffix'] as const).map((part) => (
          <Input
            key={part}
            aria-label={`${part === 'prefix' ? 'Prefixo' : 'Sufixo'} de {{${key}}}`}
            className={cn(
              'col-start-2 min-h-9 py-1.5 md:col-start-auto',
              !affixOpen && 'opacity-50'
            )}
            maxLength={40}
            disabled={!affixOpen}
            value={hasValue ? current[part] : ''}
            onChange={(e) => setAffix({ [part]: e.target.value } as never)}
            placeholder={part === 'prefix' ? 'Prefixo' : 'Sufixo'}
            title={
              affixOpen
                ? `${part === 'prefix' ? 'Antes' : 'Depois'} do valor; só aparece quando há valor.`
                : current.choice === 'EMPTY'
                  ? 'Vazia não tem valor para receber prefixo ou sufixo.'
                  : 'Escolha o valor primeiro.'
            }
          />
        ))}
        {error && (
          <p className="col-span-2 text-xs text-rose-700 md:col-span-3 md:col-start-3 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-1">
      <div>
        <h4 className="text-sm font-medium">Variáveis do modelo</h4>
        <p className="text-xs text-on-surface-variant">
          Na ordem em que aparecem na assinatura ao lado. “Não muda” deixa para
          a regra de prioridade menor. Prefixo e sufixo só aparecem quando há
          valor; o espaço é automático.
        </p>
      </div>
      <div className="hidden grid-cols-[1.5rem_9.5rem_minmax(0,1fr)_6.5rem_6.5rem] gap-x-2 px-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-on-surface-variant md:grid">
        <span>#</span>
        <span>Variável · fica</span>
        <span>Valor</span>
        <span>Prefixo</span>
        <span>Sufixo</span>
      </div>
      {info.isLoading && (
        <p className="text-xs text-on-surface-variant">Carregando variáveis…</p>
      )}
      {!info.isLoading &&
        ordered.length + others.length + orphans.length === 0 && (
          <p className="text-xs text-on-surface-variant">
            Nenhum modelo usa variáveis.
          </p>
        )}
      <div className="grid gap-0.5">
        {ordered.map((key, i) => renderRow(key, i + 1))}
      </div>
      {others.length > 0 && (
        <div className="grid gap-0.5 border-t border-outline-variant pt-2">
          <button
            type="button"
            onClick={() => setShowOthers((v) => !v)}
            className="flex items-center gap-1 px-1.5 text-left text-xs font-medium text-on-surface-variant hover:text-on-surface"
            aria-expanded={showOthers}
          >
            <ChevronDown
              className={cn('size-3.5 transition', showOthers && 'rotate-180')}
              aria-hidden
            />
            Variáveis de outros modelos ({others.length})
            {othersDefined.length > 0 &&
              ` · ${othersDefined.length} definida${othersDefined.length > 1 ? 's' : ''} nesta regra`}
          </button>
          {othersShown.map((key) => renderRow(key, null))}
        </div>
      )}
      {orphans.map((key) => renderRow(key, null))}
    </div>
  )
}
