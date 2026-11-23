import { Link } from 'react-router-dom';
import { Badge, StatusBadge, type BadgeTone } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';
import type { AutomationOverview } from '../../types/api';
import { formatRelative } from '../../utils/format';

type Entry = AutomationOverview['recentEntries'][number];

/** Situação da gravação de quem entrou no AD: é aqui que se vê se o gatilho automático funcionou. */
function situation(entry: Entry, overview: AutomationOverview): { label: string; tone: BadgeTone } {
  if (entry.received) return { label: `Gravada ${formatRelative(entry.lastWriteAt)}`, tone: 'success' };
  if (entry.lastFailureAt) return { label: 'Falhou (tenta de novo em 1 h)', tone: 'danger' };
  if (!overview.settings.enabled) return { label: 'Automação desligada', tone: 'neutral' };
  const enabledAt = overview.settings.enabledAt ? new Date(overview.settings.enabledAt).getTime() : Infinity;
  if (entry.createdAt && new Date(entry.createdAt).getTime() < enabledAt) return { label: 'Criada antes de ligar a automação', tone: 'neutral' };
  if (entry.signatureStatus !== 'READY' && !overview.settings.includePending) return { label: 'Aguardando dados', tone: 'warning' };
  return { label: 'Na próxima verificação', tone: 'info' };
}

export function RecentEntriesCard({ overview }: { overview: AutomationOverview }) {
  const entries = overview.recentEntries;
  return (
    <Card title={`Entradas no AD (últimos ${overview.recentDays} dias)`} subtitle="Quem foi criado no AD e se já recebeu a assinatura" bodyClassName="p-0">
      {entries.length === 0 ? (
        <div className="p-3.5">
          <EmptyState title="Ninguém criado no AD nesse período." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-table-head text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-semibold">Colaborador</th>
                <th className="px-3 py-2 font-semibold">Criado no AD</th>
                <th className="px-3 py-2 font-semibold">Assinatura</th>
                <th className="px-3 py-2 font-semibold">Gravação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {entries.map((entry) => {
                const s = situation(entry, overview);
                return (
                  <tr key={entry.id} className="align-top">
                    <td className="px-3 py-1.5">
                      <Link to={`/colaboradores?pessoa=${encodeURIComponent(entry.id)}`} className="font-medium hover:text-primary-ink">
                        {entry.name}
                      </Link>
                      <div className="text-xs text-on-surface-variant">
                        {entry.team} · {entry.area}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-on-surface-variant" title={entry.createdAt ?? ''}>
                      {formatRelative(entry.createdAt)}
                    </td>
                    <td className="px-3 py-1.5">
                      <StatusBadge status={entry.signatureStatus} />
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
