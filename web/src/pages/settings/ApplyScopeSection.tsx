import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Segmented } from '../../components/ui/Segmented'
import { useApplyScope } from '../../hooks/useApplyScope'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { ApiError } from '../../services/api-client'
import { collaboratorService } from '../../services/collaborator.service'
import { queryKeys } from '../../services/query-keys'
import type { ApplyScope } from '../../types/api'

/** Quem pode receber gravação: a lista de teste (padrão) ou todos. */
export function ApplyScopeSection() {
  const { scope, save } = useApplyScope()
  const [draft, setDraft] = useState<ApplyScope>(scope)
  // Escopo salvo mudou: o rascunho recomeça dele (ajuste no render, sem efeito).
  const [draftSource, setDraftSource] = useState(scope)
  if (draftSource !== scope) {
    setDraftSource(scope)
    setDraft(scope)
  }

  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const people = useQuery({
    queryKey: queryKeys.collaborators({
      search: debounced,
      page: 1,
      pageSize: 6,
    }),
    queryFn: () =>
      collaboratorService.list({ search: debounced, page: 1, pageSize: 6 }),
    enabled: debounced.trim().length >= 2,
  })

  const add = (email: string) => {
    const value = email.trim().toLowerCase()
    if (value && !draft.emails.includes(value))
      setDraft({ ...draft, emails: [...draft.emails, value] })
    setSearch('')
  }
  const dirty =
    draft.mode !== scope.mode || draft.emails.join() !== scope.emails.join()
  const error = save.error instanceof ApiError ? save.error : null

  return (
    <section className="grid gap-3 rounded-2xl border border-outline-variant p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Quem recebe a gravação</h3>
          <p className="text-xs text-on-surface-variant">
            Na lista de teste, os demais aparecem como “Pulada” mesmo se forem
            marcados.
          </p>
        </div>
        <Segmented<ApplyScope['mode']>
          ariaLabel="Quem recebe a gravação"
          value={draft.mode}
          onChange={(mode) => setDraft({ ...draft, mode })}
          options={[
            { value: 'LIST', label: 'Só a lista de teste' },
            { value: 'ALL', label: 'Todos' },
          ]}
        />
      </div>

      {draft.mode === 'ALL' && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200">
          Com “Todos”, qualquer lote grava de verdade na assinatura de quem
          estiver marcado. A anterior fica guardada para desfazer.
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {draft.emails.length === 0 && (
          <span className="text-xs text-on-surface-variant">Lista vazia.</span>
        )}
        {draft.emails.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded bg-surface-container-low px-1.5 py-0.5 text-xs"
          >
            {email}
            <button
              type="button"
              aria-label={`Tirar ${email}`}
              onClick={() =>
                setDraft({
                  ...draft,
                  emails: draft.emails.filter((e) => e !== email),
                })
              }
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && search.includes('@')) {
              e.preventDefault()
              add(search)
            }
          }}
          placeholder="Buscar pessoa para incluir (nome ou e-mail)"
          aria-label="Incluir na lista de teste"
        />
        {search.trim().length >= 2 &&
          people.data &&
          people.data.items.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
              {people.data.items.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => add(p.email)}
                    className="flex w-full flex-col px-3 py-1.5 text-left text-sm hover:bg-surface-container-low"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-on-surface-variant">
                      {p.email} · {p.team}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {error && (
          <span className="mr-auto text-xs text-rose-700 dark:text-rose-300">
            {error.message} {error.details.map((d) => d.message).join(' ')}
          </span>
        )}
        {save.isSuccess && !dirty && (
          <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
            <Check className="size-3.5" /> Salvo.
          </span>
        )}
        <Button
          variant="primary"
          loading={save.isPending}
          disabled={!dirty}
          onClick={() => save.mutate(draft)}
        >
          Salvar
        </Button>
      </div>
    </section>
  )
}
