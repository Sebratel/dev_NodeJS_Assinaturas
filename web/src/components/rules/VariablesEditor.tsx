import { useState } from 'react'
import { useTemplateVariables } from '../../hooks/useTemplateVariables'
import type {
  VariableChoiceValue,
  VariableFormValue,
} from '../../pages/rules/rule-form'
import { cn } from '../../utils/cn'
import { Input, Select } from '../ui/Input'

interface VariablesEditorProps {
  value: Record<string, VariableFormValue>
  onChange: (next: Record<string, VariableFormValue>) => void
  /** Modelo escolhido na regra: mostra só as variáveis dele (mais as que a regra já define). */
  templateId: string
  /** Erro por variável. */
  errors?: Record<string, string | undefined>
}

const EMPTY_VALUE: VariableFormValue = { choice: '', text: '', prefix: '' }

/**
 * Uma linha por variável dos modelos ({{cargo}}, {{teste}}…), cada uma com um seletor:
 * não muda, vazio, texto fixo ou um campo do AD/sistema.
 */
export function VariablesEditor({
  value,
  onChange,
  templateId,
  errors = {},
}: VariablesEditorProps) {
  const info = useTemplateVariables()
  const [showAll, setShowAll] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const touch = (key: string) =>
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  const fields = info.data?.fields ?? []
  const all = info.data?.variables ?? []
  const filtered = Boolean(templateId) && !showAll
  const rows = all.filter(
    (v) =>
      !filtered ||
      v.templates.some((t) => t.id === templateId) ||
      value[v.key]?.choice
  )
  // Variável que a regra define mas nenhum modelo usa mais: continua na lista para poder tirar.
  const orphans = Object.keys(value).filter(
    (key) => value[key]?.choice && !all.some((v) => v.key === key)
  )
  const set = (key: string, change: Partial<VariableFormValue>) =>
    onChange({ ...value, [key]: { ...(value[key] ?? EMPTY_VALUE), ...change } })

  const renderRow = (
    key: string,
    defaultLabel: string,
    usedIn: string | null
  ) => {
    const current = value[key] ?? EMPTY_VALUE
    const decided = Boolean(current.choice)
    // Aviso local: a validação do formulário só chega ao salvar (o campo controlado re-renderiza antes dela).
    const error =
      errors[key] ??
      (current.choice === 'TEXT' && !current.text.trim() && touched.has(key)
        ? 'Escreva o texto ou escolha Vazio.'
        : undefined)
    return (
      <div
        key={key}
        className="grid gap-1.5 py-1.5 sm:grid-cols-[11rem_1fr] sm:items-start"
      >
        <div className="min-w-0 pt-2" title={usedIn ?? undefined}>
          <code
            className={cn(
              'block truncate font-mono text-[13px]',
              decided
                ? 'font-semibold text-on-surface'
                : 'text-on-surface-variant'
            )}
          >
            {`{{${key}}}`}
          </code>
        </div>
        <div className="grid gap-1">
          <div className="flex flex-wrap gap-1.5">
            <Select
              aria-label={`Valor de {{${key}}}`}
              className={cn(
                'min-h-9 py-1.5',
                current.choice === 'TEXT' ? 'w-44 shrink-0' : 'flex-1'
              )}
              value={current.choice}
              onChange={(e) =>
                set(key, { choice: e.target.value as VariableChoiceValue })
              }
            >
              <option value="">{`Não muda (padrão: ${defaultLabel})`}</option>
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
                className="min-h-9 min-w-48 flex-1 py-1.5"
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
            {current.choice.startsWith('FIELD:') && (
              <Input
                aria-label={`Prefixo de {{${key}}}`}
                title="Vem antes do valor, só quando o campo tem valor. Em branco: só o valor."
                className="min-h-9 w-40 shrink-0 py-1.5"
                maxLength={40}
                value={current.prefix ?? ''}
                onChange={(e) => set(key, { prefix: e.target.value })}
                placeholder="Prefixo (opcional)"
              />
            )}
          </div>
          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Variáveis do modelo</h4>
          <p className="text-xs text-on-surface-variant">
            “Não muda” deixa a variável para a regra de prioridade menor. Campo
            aceita prefixo opcional (<code>Time:</code>); texto fixo aceita
            campos (<code>{'{{ramal}}'}</code>).
          </p>
        </div>
        {templateId && (
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-primary-ink hover:underline"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Só as deste modelo' : 'Ver de todos os modelos'}
          </button>
        )}
      </div>
      {info.isLoading && (
        <p className="text-xs text-on-surface-variant">Carregando variáveis…</p>
      )}
      {!info.isLoading && rows.length + orphans.length === 0 && (
        <p className="text-xs text-on-surface-variant">
          Nenhum modelo usa variáveis.
        </p>
      )}
      <div className="divide-y divide-outline-variant">
        {rows.map((v) =>
          renderRow(
            v.key,
            v.defaultLabel,
            `Usada em: ${v.templates.map((t) => t.name).join(', ')}`
          )
        )}
        {orphans.map((key) =>
          renderRow(key, 'Vazio', 'Nenhum modelo usa mais esta variável')
        )}
      </div>
    </div>
  )
}
