import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { collaboratorService, type CollaboratorFilters } from '../../services/collaborator.service';
import { queryKeys } from '../../services/query-keys';
import type { Level, SignatureStatus } from '../../types/api';
import { formatNumber } from '../../utils/format';
import { CONTACT_LABELS, ISSUE_LABELS, LEVEL_LABELS, STATUS_LABELS } from '../../utils/labels';
import { CollaboratorDrawer } from './CollaboratorDrawer';

const PAGE_SIZE = 25;

/** Filtros vivem na URL: dá para mandar o link de "pendentes do Suporte" para alguém. */
export function CollaboratorsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('busca') ?? '';
  const debouncedSearch = useDebouncedValue(search);
  const filters: CollaboratorFilters = {
    search: debouncedSearch,
    area: params.get('area') ?? '',
    team: params.get('time') ?? '',
    level: (params.get('nivel') ?? '') as Level | '',
    status: (params.get('status') ?? '') as SignatureStatus | '',
    page: Number(params.get('pagina') ?? 1) || 1,
    pageSize: PAGE_SIZE,
  };
  const selectedId = params.get('pessoa');

  const update = (changes: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!keepPage) next.delete('pagina');
    setParams(next, { replace: true });
  };

  const facets = useQuery({ queryKey: queryKeys.facets, queryFn: collaboratorService.facets });
  const list = useQuery({
    queryKey: queryKeys.collaborators(filters),
    queryFn: () => collaboratorService.list(filters),
    placeholderData: keepPreviousData,
  });

  const teams = (facets.data?.teams ?? []).filter((t) => !filters.area || t.area === filters.area);
  const meta = list.data?.meta;
  const hasFilters = Boolean(search || filters.area || filters.team || filters.level || filters.status);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5">
        <label className="relative min-w-56 flex-[2]">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" aria-hidden />
          <Input value={search} onChange={(e) => update({ busca: e.target.value })} placeholder="Nome, e-mail, cargo ou time" className="pl-8" />
        </label>
        <Select aria-label="Área" value={filters.area} onChange={(e) => update({ area: e.target.value, time: '' })} className="min-w-36 flex-1">
          <option value="">Todas as áreas</option>
          {facets.data?.areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
        <Select aria-label="Time" value={filters.team} onChange={(e) => update({ time: e.target.value })} className="min-w-40 flex-1">
          <option value="">Todos os times</option>
          {teams.map((t) => (
            <option key={`${t.area}|${t.team}`} value={t.team}>
              {t.team}
              {filters.area ? '' : ` · ${t.area}`}
            </option>
          ))}
        </Select>
        <Select aria-label="Nível" value={filters.level} onChange={(e) => update({ nivel: e.target.value })} className="min-w-36 flex-1">
          <option value="">Todos os níveis</option>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })} className="min-w-32 flex-1">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Limpar
          </Button>
        )}
      </div>

      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.isLoading && <LoadingState />}
      {list.data && list.data.items.length === 0 && <EmptyState title="Ninguém com esses filtros." />}

      {list.data && list.data.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-table-head text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-3 py-2 font-semibold">Colaborador</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Cargo</th>
                  <th className="px-3 py-2 font-semibold">Contato</th>
                  <th className="px-3 py-2 font-semibold">Assinatura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {list.data.items.map((person) => (
                  <tr
                    key={person.id}
                    onClick={() => update({ pessoa: person.id }, true)}
                    className="cursor-pointer align-top hover:bg-surface-container-low"
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left font-medium hover:text-primary-ink"
                        onClick={(event) => {
                          event.stopPropagation();
                          update({ pessoa: person.id }, true);
                        }}
                      >
                        {person.name}
                      </button>
                      <div className="text-xs text-on-surface-variant">{person.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{person.team || '—'}</div>
                      <div className="text-xs text-on-surface-variant">{person.area}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="max-w-64 truncate" title={person.title}>
                        {person.title || '—'}
                      </div>
                      <div className="text-xs text-on-surface-variant">{LEVEL_LABELS[person.level]}</div>
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">{CONTACT_LABELS[person.contactType]}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={person.status} />
                        {person.issueCodes.map((code) => (
                          <Badge key={code}>{ISSUE_LABELS[code]}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && (
            <footer className="flex items-center justify-between gap-2 border-t border-outline-variant px-3 py-2 text-xs text-on-surface-variant">
              <span className="tabular-nums">
                {formatNumber(meta.totalItems)} pessoas · página {meta.page} de {meta.totalPages}
              </span>
              <div className="flex gap-1">
                <Button size="sm" icon={<ChevronLeft className="size-3.5" />} disabled={meta.page <= 1} onClick={() => update({ pagina: String(meta.page - 1) }, true)}>
                  Anterior
                </Button>
                <Button size="sm" disabled={meta.page >= meta.totalPages} onClick={() => update({ pagina: String(meta.page + 1) }, true)}>
                  Próxima <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </footer>
          )}
        </div>
      )}

      <CollaboratorDrawer collaboratorId={selectedId} onClose={() => update({ pessoa: '' }, true)} />
    </div>
  );
}
