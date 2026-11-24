import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileSpreadsheet, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ReadOnlyNote } from '../../components/ui/ReadOnlyNote'
import { Segmented } from '../../components/ui/Segmented'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { usePermissions } from '../../hooks/usePermissions'
import { ApiError } from '../../services/api-client'
import { collaboratorService } from '../../services/collaborator.service'
import { derivedQueryRoots, queryKeys } from '../../services/query-keys'
import { settingService } from '../../services/setting.service'
import type { DirectoryTeam, Settings } from '../../types/api'
import { cn } from '../../utils/cn'
import { formatNumber } from '../../utils/format'
import { ImportPhrasesDialog } from './ImportPhrasesDialog'

type Filter = 'all' | 'missing' | 'filled'
const MAX = 140
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const keyOf = (t: { area: string; team: string }) => `${t.area}|${t.team}`

/** Frase de cada time do AD e a frase padrão. Grava na configuração team-phrases. */
export function TeamPhrasesSection() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermissions()
  const facets = useQuery({
    queryKey: queryKeys.facets,
    queryFn: collaboratorService.facets,
  })
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: settingService.getAll,
  })

  const teams = useMemo(
    () =>
      [...(facets.data?.teams ?? [])].sort(
        (a, b) =>
          a.area.localeCompare(b.area, 'pt-BR') ||
          a.team.localeCompare(b.team, 'pt-BR')
      ),
    [facets.data]
  )
  const saved = settings.data?.['team-phrases']

  // Rascunho: frase por área|time, a frase padrão e as frases de times que não existem mais no AD.
  const [draft, setDraft] = useState<Map<string, string>>(new Map())
  const [defaultPhrase, setDefaultPhrase] = useState('')
  const [orphans, setOrphans] = useState<Settings['team-phrases']['byTeam']>([])
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [orphansChanged, setOrphansChanged] = useState(false)
  // Configuração salva ou lista de times mudou: o rascunho recomeça delas (ajuste no render, sem efeito).
  const [draftSource, setDraftSource] = useState<{
    saved?: typeof saved
    teams?: typeof teams
  }>({})
  if (
    saved &&
    teams.length &&
    (draftSource.saved !== saved || draftSource.teams !== teams)
  ) {
    setDraftSource({ saved, teams })
    const next = new Map<string, string>()
    for (const t of teams) {
      const exact = saved.byTeam.find(
        (p) =>
          p.area &&
          norm(p.area) === norm(t.area) &&
          norm(p.team) === norm(t.team)
      )
      const anyArea = saved.byTeam.find(
        (p) => !p.area && norm(p.team) === norm(t.team)
      )
      next.set(keyOf(t), (exact ?? anyArea)?.phrase ?? '')
    }
    setDraft(next)
    setDefaultPhrase(saved.defaultPhrase)
    setOrphans(
      saved.byTeam.filter(
        (p) =>
          !teams.some(
            (t) =>
              norm(t.team) === norm(p.team) &&
              (!p.area || norm(t.area) === norm(p.area))
          )
      )
    )
    setTouched(new Set())
    setOrphansChanged(false)
  }

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [importing, setImporting] = useState(false)

  const save = useMutation({
    mutationFn: () =>
      settingService.update('team-phrases', {
        defaultPhrase,
        byTeam: [
          ...teams
            .filter((t) => draft.get(keyOf(t))?.trim())
            .map((t) => ({
              area: t.area,
              team: t.team,
              phrase: draft.get(keyOf(t))!.trim(),
            })),
          ...orphans,
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
      derivedQueryRoots.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      )
    },
  })

  const setPhrase = (key: string, phrase: string) => {
    setDraft(new Map(draft).set(key, phrase))
    setTouched(new Set(touched).add(key))
  }
  const applyImport = (
    assignments: Array<{ area: string; team: string; phrase: string }>
  ) => {
    const next = new Map(draft)
    const nextTouched = new Set(touched)
    assignments.forEach((a) => {
      next.set(keyOf(a), a.phrase.slice(0, MAX))
      nextTouched.add(keyOf(a))
    })
    setDraft(next)
    setTouched(nextTouched)
  }

  if (facets.isLoading || settings.isLoading) return <LoadingState />
  if (facets.isError || settings.isError)
    return (
      <ErrorState
        error={facets.error ?? settings.error}
        onRetry={() => (facets.refetch(), settings.refetch())}
      />
    )

  const filled = teams.filter((t) => draft.get(keyOf(t))?.trim())
  const peopleWithPhrase = filled.reduce((sum, t) => sum + t.count, 0)
  const totalPeople = teams.reduce((sum, t) => sum + t.count, 0)
  const q = norm(search)
  const visible = teams.filter((t) => {
    const has = Boolean(draft.get(keyOf(t))?.trim())
    if (filter === 'missing' && has) return false
    if (filter === 'filled' && !has) return false
    return (
      !q || norm(`${t.area} ${t.team} ${draft.get(keyOf(t)) ?? ''}`).includes(q)
    )
  })
  const dirty =
    touched.size > 0 || orphansChanged || defaultPhrase !== saved?.defaultPhrase
  const tooLong =
    teams.some((t) => (draft.get(keyOf(t)) ?? '').length > MAX) ||
    defaultPhrase.length > MAX

  return (
    <div className={cn('grid gap-3', canEdit && 'pb-16')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-on-surface-variant">
          <strong className="tabular-nums text-on-surface">
            {filled.length}
          </strong>{' '}
          de {teams.length} times com frase ·{' '}
          <span className="tabular-nums">{formatNumber(peopleWithPhrase)}</span>{' '}
          de {formatNumber(totalPeople)} pessoas. Time sem frase usa a padrão.
        </p>
        {canEdit ? (
          <Button
            icon={<FileSpreadsheet className="size-4" />}
            onClick={() => setImporting(true)}
          >
            Importar da planilha
          </Button>
        ) : (
          <ReadOnlyNote />
        )}
      </div>

      <div className="grid gap-1 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
        <label
          htmlFor="default-phrase"
          className="flex justify-between text-xs font-medium"
        >
          Frase padrão
          <span
            className={cn(
              'tabular-nums',
              defaultPhrase.length > MAX
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-on-surface-variant'
            )}
          >
            {defaultPhrase.length}/{MAX}
          </span>
        </label>
        <Input
          id="default-phrase"
          value={defaultPhrase}
          readOnly={!canEdit}
          onChange={(e) => setDefaultPhrase(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Buscar</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Área, time ou frase"
            className="pl-8"
          />
        </label>
        <Segmented<Filter>
          ariaLabel="Mostrar"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos' },
            {
              value: 'missing',
              label: `Sem frase (${teams.length - filled.length})`,
            },
            { value: 'filled', label: 'Com frase' },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-semibold">Time</th>
                <th className="w-16 px-3 py-2 text-right font-semibold">
                  Pessoas
                </th>
                <th className="px-3 py-2 font-semibold">Frase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {visible.map((t: DirectoryTeam) => {
                const key = keyOf(t)
                const value = draft.get(key) ?? ''
                return (
                  <tr
                    key={key}
                    className={cn(
                      'align-middle',
                      touched.has(key) && 'bg-primary/5'
                    )}
                  >
                    <td className="px-3 py-1.5">
                      <div className="font-medium">{t.team}</div>
                      <div className="text-xs text-on-surface-variant">
                        {t.area}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-on-surface-variant">
                      {t.count}
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={value}
                        readOnly={!canEdit}
                        onChange={(e) => setPhrase(key, e.target.value)}
                        placeholder={`usa a padrão: ${defaultPhrase}`}
                        aria-label={`Frase de ${t.team} (${t.area})`}
                        aria-invalid={value.length > MAX}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {orphans.length > 0 && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
          <h3 className="text-sm font-semibold">
            Frases de times que não estão mais no AD
          </h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {orphans.map((o, i) => (
              <li
                key={`${o.area ?? ''}|${o.team}`}
                className="flex items-center gap-2"
              >
                <Badge>{o.area ? `${o.team} · ${o.area}` : o.team}</Badge>
                <span className="min-w-0 flex-1 truncate text-on-surface-variant">
                  {o.phrase}
                </span>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Tirar"
                    onClick={() => {
                      setOrphans(orphans.filter((_, j) => j !== i))
                      setOrphansChanged(true)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur-md transition-[left] duration-300 xl:left-(--sidebar-w)">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-3 px-4 py-2 lg:px-6">
            {save.error instanceof ApiError && (
              <span className="mr-auto text-xs text-rose-700 dark:text-rose-300">
                {save.error.message}
              </span>
            )}
            {tooLong && (
              <span className="mr-auto text-xs text-rose-700 dark:text-rose-300">
                Há frase com mais de {MAX} caracteres.
              </span>
            )}
            {save.isSuccess && !dirty && (
              <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="size-3.5" /> Salvo. Prévias e cobertura
                recalculadas.
              </span>
            )}
            <Button
              variant="primary"
              loading={save.isPending}
              disabled={!dirty || tooLong}
              onClick={() => save.mutate()}
            >
              Salvar frases
            </Button>
          </div>
        </div>
      )}

      {importing && (
        <ImportPhrasesDialog
          teams={teams}
          onApply={applyImport}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  )
}
