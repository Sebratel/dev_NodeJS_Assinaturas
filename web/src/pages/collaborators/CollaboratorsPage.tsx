import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Mail, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppPageHeader } from '../../components/layout/AppPageHeader'
import { ApplyDialog } from '../../components/signature/ApplyDialog'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { usePermissions } from '../../hooks/usePermissions'
import {
  collaboratorService,
  type CollaboratorFilters,
} from '../../services/collaborator.service'
import { queryKeys } from '../../services/query-keys'
import { googleIntegrationService } from '../../services/report.service'
import type {
  CollaboratorFilterParams,
  Level,
  SignatureStatus,
} from '../../types/api'
import { formatNumber } from '../../utils/format'
import {
  CONTACT_LABELS,
  ISSUE_LABELS,
  LEVEL_LABELS,
  STATUS_LABELS,
} from '../../utils/labels'
import { CollaboratorDrawer } from './CollaboratorDrawer'

const PAGE_SIZE = 25
const CHECKBOX = 'size-4 cursor-pointer accent-[var(--color-primary)]'

/** Filtros vivem na URL: dá para mandar o link de "pendentes do Suporte" para alguém. */
export function CollaboratorsPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('busca') ?? ''
  const debouncedSearch = useDebouncedValue(search)
  const filters: CollaboratorFilters = {
    search: debouncedSearch,
    area: params.get('area') ?? '',
    team: params.get('time') ?? '',
    level: (params.get('nivel') ?? '') as Level | '',
    status: (params.get('status') ?? '') as SignatureStatus | '',
    page: Number(params.get('pagina') ?? 1) || 1,
    pageSize: PAGE_SIZE,
  }
  const selectedId = params.get('pessoa')

  const update = (changes: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key)
    )
    if (!keepPage) next.delete('pagina')
    setParams(next, { replace: true })
  }

  const facets = useQuery({
    queryKey: queryKeys.facets,
    queryFn: collaboratorService.facets,
  })
  // Marcar pessoas só serve para gravar em lote no Gmail: só Master vê as caixas.
  const { canApply } = usePermissions()
  const google = useQuery({
    queryKey: queryKeys.googleIntegration,
    queryFn: googleIntegrationService.status,
    enabled: canApply,
  })
  const list = useQuery({
    queryKey: queryKeys.collaborators(filters),
    queryFn: () => collaboratorService.list(filters),
    placeholderData: keepPreviousData,
  })

  // Seleção: ids marcados (valem entre páginas) ou "todos do filtro".
  const filterKey = JSON.stringify({ ...filters, page: undefined })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [applying, setApplying] = useState(false)
  // Filtro mudou: a seleção anterior não vale mais (ajuste no render, sem efeito).
  const [selectionFilterKey, setSelectionFilterKey] = useState(filterKey)
  if (selectionFilterKey !== filterKey) {
    setSelectionFilterKey(filterKey)
    setSelected(new Set())
    setAllMatching(false)
  }

  const items = list.data?.items ?? []
  const meta = list.data?.meta
  const pageIds = items.map((p) => p.id)
  const pageAllSelected =
    allMatching ||
    (pageIds.length > 0 && pageIds.every((id) => selected.has(id)))
  const selectionCount = allMatching ? (meta?.totalItems ?? 0) : selected.size

  const toggleOne = (id: string) => {
    if (allMatching) return
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const togglePage = () => {
    if (allMatching) return clearSelection()
    const next = new Set(selected)
    pageIds.forEach((id) => (pageAllSelected ? next.delete(id) : next.add(id)))
    setSelected(next)
  }
  const clearSelection = () => {
    setSelected(new Set())
    setAllMatching(false)
  }

  const filterParams = useMemo<CollaboratorFilterParams>(() => {
    const entries = {
      search: filters.search,
      area: filters.area,
      team: filters.team,
      level: filters.level,
      status: filters.status,
    }
    return Object.fromEntries(
      Object.entries(entries).filter(([, v]) => v)
    ) as CollaboratorFilterParams
  }, [
    filters.search,
    filters.area,
    filters.team,
    filters.level,
    filters.status,
  ])

  const teams = (facets.data?.teams ?? []).filter(
    (t) => !filters.area || t.area === filters.area
  )
  const hasFilters = Boolean(
    search || filters.area || filters.team || filters.level || filters.status
  )

  return (
    <div className="grid gap-4 pb-16">
      <AppPageHeader />
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-2.5">
        <label className="relative min-w-56 flex-[2]">
          <span className="sr-only">Buscar</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => update({ busca: e.target.value })}
            placeholder="Nome, e-mail, cargo ou time"
            className="pl-8"
          />
        </label>
        <Select
          aria-label="Área"
          value={filters.area}
          onChange={(e) => update({ area: e.target.value, time: '' })}
          className="min-w-36 flex-1"
        >
          <option value="">Todas as áreas</option>
          {facets.data?.areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
        <Select
          aria-label="Time"
          value={filters.team}
          onChange={(e) => update({ time: e.target.value })}
          className="min-w-40 flex-1"
        >
          <option value="">Todos os times</option>
          {teams.map((t) => (
            <option key={`${t.area}|${t.team}`} value={t.team}>
              {t.team}
              {filters.area ? '' : ` · ${t.area}`}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Nível"
          value={filters.level}
          onChange={(e) => update({ nivel: e.target.value })}
          className="min-w-36 flex-1"
        >
          <option value="">Todos os níveis</option>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Status"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          className="min-w-32 flex-1"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
          >
            Limpar
          </Button>
        )}
      </div>

      {list.isError && (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      )}
      {list.isLoading && <LoadingState />}
      {list.data && items.length === 0 && (
        <EmptyState title="Ninguém com esses filtros." />
      )}

      {list.data && items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {canApply &&
            pageAllSelected &&
            meta &&
            meta.totalItems > items.length && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-b border-outline-variant bg-primary/10 px-3 py-1.5 text-xs">
                {allMatching ? (
                  <>
                    Todos os{' '}
                    <strong className="tabular-nums">
                      {formatNumber(meta.totalItems)}
                    </strong>{' '}
                    do filtro estão marcados.
                    <button
                      type="button"
                      className="font-medium text-primary-ink underline"
                      onClick={clearSelection}
                    >
                      Desmarcar
                    </button>
                  </>
                ) : (
                  <>
                    Os {items.length} desta página estão marcados.
                    <button
                      type="button"
                      className="font-medium text-primary-ink underline"
                      onClick={() => setAllMatching(true)}
                    >
                      Marcar todos os {formatNumber(meta.totalItems)} do filtro
                    </button>
                  </>
                )}
              </div>
            )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                  {canApply && (
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        className={CHECKBOX}
                        checked={pageAllSelected}
                        onChange={togglePage}
                        aria-label="Marcar a página"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2 font-semibold">Colaborador</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Cargo</th>
                  <th className="px-3 py-2 font-semibold">Contato</th>
                  <th className="px-3 py-2 font-semibold">Assinatura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {items.map((person) => {
                  const checked = allMatching || selected.has(person.id)
                  return (
                    <tr
                      key={person.id}
                      onClick={() => update({ pessoa: person.id }, true)}
                      className={`cursor-pointer align-top hover:bg-surface-container-low ${checked ? 'bg-primary/5' : ''}`}
                    >
                      {canApply && (
                        <td
                          className="px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className={CHECKBOX}
                            checked={checked}
                            disabled={allMatching}
                            onChange={() => toggleOne(person.id)}
                            aria-label={`Marcar ${person.name}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-left font-medium hover:text-primary-ink"
                          onClick={(event) => {
                            event.stopPropagation()
                            update({ pessoa: person.id }, true)
                          }}
                        >
                          {person.name}
                        </button>
                        <div className="text-xs text-on-surface-variant">
                          {person.email}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div>{person.team || '—'}</div>
                        <div className="text-xs text-on-surface-variant">
                          {person.area}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-64 truncate" title={person.title}>
                          {person.title || '—'}
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          {LEVEL_LABELS[person.level]}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        {CONTACT_LABELS[person.contactType]}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={person.status} />
                          {person.issueCodes.map((code) => (
                            <Badge key={code}>{ISSUE_LABELS[code]}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {meta && (
            <footer className="flex items-center justify-between gap-2 border-t border-outline-variant px-3 py-2 text-xs text-on-surface-variant">
              <span className="tabular-nums">
                {formatNumber(meta.totalItems)} pessoas · página {meta.page} de{' '}
                {meta.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  icon={<ChevronLeft className="size-3.5" />}
                  disabled={meta.page <= 1}
                  onClick={() =>
                    update({ pagina: String(meta.page - 1) }, true)
                  }
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() =>
                    update({ pagina: String(meta.page + 1) }, true)
                  }
                >
                  Próxima <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </footer>
          )}
        </div>
      )}

      {canApply && selectionCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur-md transition-[left] duration-300 xl:left-(--sidebar-w)">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 lg:px-6">
            <span className="text-sm">
              <strong className="tabular-nums">
                {formatNumber(selectionCount)}
              </strong>{' '}
              {selectionCount === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Limpar seleção
            </Button>
            <Button
              variant="primary"
              className="ml-auto"
              icon={<Mail className="size-4" />}
              disabled={!google.data?.applyEnabled}
              title={
                google.data?.applyEnabled
                  ? undefined
                  : 'Google não autorizado. Veja Configurações › Google.'
              }
              onClick={() => setApplying(true)}
            >
              Aplicar no Gmail
            </Button>
          </div>
        </div>
      )}

      {applying && (
        <ApplyDialog
          target={
            allMatching
              ? { filter: filterParams }
              : { collaboratorIds: [...selected] }
          }
          count={selectionCount}
          onClose={() => {
            setApplying(false)
            clearSelection()
          }}
        />
      )}

      <CollaboratorDrawer
        collaboratorId={selectedId}
        onClose={() => update({ pessoa: '' }, true)}
      />
    </div>
  )
}
