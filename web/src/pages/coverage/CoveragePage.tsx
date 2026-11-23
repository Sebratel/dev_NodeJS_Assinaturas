import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { queryKeys } from '../../services/query-keys';
import { reportService } from '../../services/report.service';
import type { ContactType, SignatureStatus } from '../../types/api';
import { cn } from '../../utils/cn';
import { formatNumber, formatPercent } from '../../utils/format';
import { CONTACT_LABELS, ISSUE_LABELS, LEVEL_LABELS, SLOT_LABELS, STATUS_LABELS, STATUS_TONES } from '../../utils/labels';
import type { RuleDraftState } from '../rules/RulesPage';

const KPI_ACCENT: Record<SignatureStatus, string> = {
  READY: 'border-l-emerald-500',
  PENDING: 'border-l-amber-500',
  CONFLICT: 'border-l-rose-500',
  NO_RULE: 'border-l-on-surface-variant/40',
};

const GROUPS_PREVIEW = 12;

export function CoveragePage() {
  const navigate = useNavigate();
  const coverage = useQuery({ queryKey: queryKeys.coverage, queryFn: reportService.coverage });
  const [showAllGroups, setShowAllGroups] = useState(false);

  if (coverage.isLoading) return <LoadingState />;
  if (coverage.isError) return <ErrorState error={coverage.error} onRetry={() => coverage.refetch()} />;
  const report = coverage.data;
  if (!report) return null;
  const total = report.totalCollaborators;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5">
          <p className="text-xs text-on-surface-variant">Colaboradores</p>
          <p className="text-2xl font-semibold tabular-nums">{formatNumber(total)}</p>
          <p className="text-[11px] text-on-surface-variant">{formatNumber(report.onlyGeneralRules)} só com a regra geral</p>
        </div>
        {(Object.keys(STATUS_LABELS) as SignatureStatus[]).map((status) => (
          <Link
            key={status}
            to={`/colaboradores?status=${status}`}
            className={cn('rounded-2xl border border-l-[3px] border-outline-variant bg-surface-container-lowest px-3 py-2.5 hover:bg-surface-container-low', KPI_ACCENT[status])}
          >
            <p className="text-xs text-on-surface-variant">{STATUS_LABELS[status]}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatNumber(report.byStatus[status])}</p>
            <p className="text-[11px] tabular-nums text-on-surface-variant">{formatPercent(report.byStatus[status], total)} do total</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="O que falta para ficar pronta" subtitle="Pendências que impedem aplicar no Gmail">
          {report.issues.filter((i) => i.severity !== 'INFO').length === 0 ? (
            <EmptyState title="Nenhuma pendência." />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {report.issues
                .filter((i) => i.severity !== 'INFO')
                .map((issue) => (
                  <li key={issue.code} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ISSUE_LABELS[issue.code]}</p>
                      <p className="truncate text-xs text-on-surface-variant">{issue.sample.map((s) => s.name).join(', ')}…</p>
                    </div>
                    <Badge tone={issue.severity === 'ERROR' ? 'warning' : 'neutral'} className="tabular-nums">
                      {formatNumber(issue.count)}
                    </Badge>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card title="Contato que sai na assinatura">
          <ul className="grid gap-2">
            {(Object.keys(CONTACT_LABELS) as ContactType[]).map((type) => {
              const count = report.byContact[type];
              return (
                <li key={type} className="grid gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{CONTACT_LABELS[type]}</span>
                    <span className="tabular-nums text-on-surface-variant">
                      {formatNumber(count)} · {formatPercent(count, total)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-low">
                    <div className="h-full rounded-full bg-primary" style={{ width: formatPercent(count, total) }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {report.conflicts.length > 0 && (
        <Card title="Conflitos entre regras" subtitle="Mesma prioridade decidindo diferente a mesma parte: ajuste a prioridade de uma delas">
          <ul className="divide-y divide-outline-variant">
            {report.conflicts.map((conflict) => (
              <li key={conflict.slot + conflict.ruleNames.join()} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {SLOT_LABELS[conflict.slot]}: {conflict.ruleNames.join(' × ')}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant">{conflict.sample.map((s) => s.name).join(', ')}</p>
                </div>
                <Badge tone={STATUS_TONES.CONFLICT}>{formatNumber(conflict.count)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="Grupos que só a regra geral pega"
        subtitle="Candidatos a uma regra própria: hoje saem só com 0800 e frase"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-semibold">Time</th>
                <th className="px-3 py-2 font-semibold">Área</th>
                <th className="px-3 py-2 font-semibold">Nível</th>
                <th className="px-3 py-2 text-right font-semibold">Pessoas</th>
                <th className="w-32 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {report.groupsOnlyGeneral.slice(0, showAllGroups ? undefined : GROUPS_PREVIEW).map((group) => (
                <tr key={`${group.area}|${group.team}|${group.level}`}>
                  <td className="px-3 py-1.5">{group.team || '—'}</td>
                  <td className="px-3 py-1.5 text-on-surface-variant">{group.area}</td>
                  <td className="px-3 py-1.5 text-on-surface-variant">{LEVEL_LABELS[group.level]}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(group.count)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Plus className="size-3.5" />}
                      onClick={() => navigate('/regras', { state: { draftFor: group } satisfies RuleDraftState })}
                    >
                      Criar regra
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.groupsOnlyGeneral.length > GROUPS_PREVIEW && (
          <div className="border-t border-outline-variant px-3 py-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAllGroups(!showAllGroups)}>
              {showAllGroups ? 'Mostrar menos' : `Mostrar todos (${report.groupsOnlyGeneral.length})`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
