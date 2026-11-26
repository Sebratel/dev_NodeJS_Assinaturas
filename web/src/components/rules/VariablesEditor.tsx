import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { queryKeys } from '../../services/query-keys'
import { signatureTemplateService } from '../../services/signature-template.service'
import type { VariableMode } from '../../types/api'
import { VARIABLE_MODE_LABELS } from '../../utils/labels'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Input'

export interface VariableRow {
  key: string
  mode: VariableMode
  text: string
}

interface VariablesEditorProps {
  rows: VariableRow[]
  onChange: (rows: VariableRow[]) => void
  /** Erro por linha (índice → mensagem). */
  errors?: Record<number, string | undefined>
}

/** "Variáveis do modelo": a regra esconde ou troca qualquer variável ({{cargo}}, {{setor}}…). */
export function VariablesEditor({
  rows,
  onChange,
  errors = {},
}: VariablesEditorProps) {
  const variables = useQuery({
    queryKey: queryKeys.templateVariables,
    queryFn: signatureTemplateService.variables,
    staleTime: Infinity,
  })
  const options = (variables.data ?? []).filter((v) => v.overridable)
  const update = (index: number, change: Partial<VariableRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...change } : r)))
  const add = () => {
    const used = new Set(rows.map((r) => r.key))
    const next = options.find((v) => !used.has(v.key))?.key ?? ''
    onChange([...rows, { key: next, mode: 'HIDE', text: '' }])
  }

  return (
    <div className="grid gap-2 border-t border-outline-variant pt-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Variáveis do modelo</h4>
          <p className="text-xs text-on-surface-variant">
            Esconde ou troca qualquer variável. No texto, dá para usar outras:{' '}
            <code>{'{{time}}'}</code>, <code>{'{{empresa}}'}</code>…
          </p>
        </div>
        <Button
          size="sm"
          icon={<Plus className="size-3.5" />}
          onClick={add}
          disabled={options.length > 0 && rows.length >= options.length}
        >
          Variável
        </Button>
      </div>
      {rows.map((row, index) => {
        const description = options.find((v) => v.key === row.key)?.description
        return (
          <div key={index} className="grid gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Select
                aria-label="Variável"
                className="w-auto min-w-36"
                value={row.key}
                onChange={(e) => update(index, { key: e.target.value })}
                title={description}
              >
                {!row.key && <option value="">escolha…</option>}
                {/* Variável gravada que saiu da lista continua visível para poder trocar. */}
                {row.key && !options.some((v) => v.key === row.key) && (
                  <option value={row.key}>{`{{${row.key}}}`}</option>
                )}
                {options.map((v) => (
                  <option key={v.key} value={v.key} title={v.description}>
                    {`{{${v.key}}}`}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="O que fazer"
                className="w-auto min-w-28"
                value={row.mode}
                onChange={(e) =>
                  update(index, { mode: e.target.value as VariableMode })
                }
              >
                {(Object.keys(VARIABLE_MODE_LABELS) as VariableMode[]).map(
                  (mode) => (
                    <option key={mode} value={mode}>
                      {VARIABLE_MODE_LABELS[mode]}
                    </option>
                  )
                )}
              </Select>
              {row.mode === 'TEXT' && (
                <Input
                  aria-label={`Texto de {{${row.key}}}`}
                  className="min-w-48 flex-1"
                  maxLength={200}
                  value={row.text}
                  onChange={(e) => update(index, { text: e.target.value })}
                  placeholder="Ex.: {{time}} · Sebratel Empresas"
                  aria-invalid={Boolean(errors[index])}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                aria-label="Tirar variável"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {errors[index] ? (
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {errors[index]}
              </p>
            ) : (
              description && (
                <p className="text-[11px] text-on-surface-variant">
                  {description}
                  {row.mode === 'HIDE' && ' · fica vazia na assinatura'}
                </p>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
