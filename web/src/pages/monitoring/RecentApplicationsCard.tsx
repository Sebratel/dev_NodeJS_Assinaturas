import { Link } from 'react-router-dom';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';
import type { ApplicationStatus, SignatureApplication } from '../../types/api';
import { formatRelative } from '../../utils/format';
import { APPLICATION_STATUS_LABELS, TRIGGER_LABELS } from '../../utils/labels';

const TONES: Record<ApplicationStatus, BadgeTone> = { APPLIED: 'success', UNCHANGED: 'neutral', SKIPPED: 'warning', FAILED: 'danger', RESTORED: 'info' };

/** Últimas gravações no Gmail, manuais e automáticas. */
export function RecentApplicationsCard({ applications }: { applications: SignatureApplication[] }) {
  return (
    <Card title="Últimas gravações" subtitle="Manuais e automáticas, da mais recente" bodyClassName="p-0">
      {applications.length === 0 ? (
        <div className="p-3.5">
          <EmptyState title="Nenhuma gravação ainda." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-table-head text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-semibold">Quando</th>
                <th className="px-3 py-2 font-semibold">Colaborador</th>
                <th className="px-3 py-2 font-semibold">Origem</th>
                <th className="px-3 py-2 font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {applications.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-1.5 text-on-surface-variant" title={new Date(a.createdAt).toLocaleString('pt-BR')}>
                    {formatRelative(a.createdAt)}
                  </td>
                  <td className="px-3 py-1.5">
                    <Link to={`/colaboradores?pessoa=${encodeURIComponent(a.collaboratorId)}`} className="font-medium hover:text-primary-ink">
                      {a.collaboratorName || a.email}
                    </Link>
                    <div className="text-xs text-on-surface-variant">{a.email}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge tone={a.trigger === 'MANUAL' ? 'neutral' : 'info'}>{TRIGGER_LABELS[a.trigger ?? 'MANUAL']}</Badge>
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge tone={TONES[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                    {a.reason && <div className="mt-0.5 max-w-80 text-xs text-on-surface-variant">{a.reason}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
