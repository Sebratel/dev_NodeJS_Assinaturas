import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Mail } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';
import { googleIntegrationService } from '../../services/report.service';
import { signatureApplicationService, type StartBatchInput } from '../../services/signature-application.service';
import type { ApplicationStatus } from '../../types/api';
import { formatNumber } from '../../utils/format';
import { APPLICATION_STATUS_LABELS } from '../../utils/labels';
import { Badge, type BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const TONES: Record<ApplicationStatus, BadgeTone> = {
  APPLIED: 'success',
  UNCHANGED: 'neutral',
  SKIPPED: 'warning',
  FAILED: 'danger',
  RESTORED: 'info',
};

interface ApplyDialogProps {
  /** Quem recebe: ids ou filtro (todos que casam). */
  target: Omit<StartBatchInput, 'includePending'>;
  count: number;
  onClose: () => void;
}

/** Confirma, grava no Gmail e acompanha o lote até o fim. */
export function ApplyDialog({ target, count, onClose }: ApplyDialogProps) {
  const queryClient = useQueryClient();
  const google = useQuery({ queryKey: queryKeys.googleIntegration, queryFn: googleIntegrationService.status });
  const [includePending, setIncludePending] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => signatureApplicationService.startBatch({ ...target, includePending }),
    onSuccess: (batch) => setBatchId(batch.id),
  });
  const batch = useQuery({
    queryKey: ['application-batch', batchId],
    queryFn: () => signatureApplicationService.getBatch(batchId!),
    enabled: Boolean(batchId),
    refetchInterval: (query) => (query.state.data?.finished ? false : 800),
  });

  const finished = batch.data?.finished ?? false;
  const close = () => {
    if (batchId) queryClient.invalidateQueries({ queryKey: ['signature-applications'] });
    onClose();
  };
  const allowlist = google.data?.applyAllowlist ?? [];
  const notReady = google.data && !google.data.applyEnabled;
  const startError = start.error instanceof ApiError ? start.error.message : null;
  const progress = batch.data ? Math.round((batch.data.processed / Math.max(1, batch.data.total)) * 100) : 0;

  return (
    <Modal
      open
      title={batchId ? 'Gravando no Gmail' : 'Aplicar no Gmail'}
      onClose={close}
      footer={
        batchId ? (
          <Button variant={finished ? 'primary' : 'secondary'} onClick={close}>
            {finished ? 'Concluir' : 'Fechar (continua gravando)'}
          </Button>
        ) : (
          <>
            <Button onClick={close}>Cancelar</Button>
            <Button variant="primary" icon={<Mail className="size-4" />} loading={start.isPending} disabled={Boolean(notReady)} onClick={() => start.mutate()}>
              Gravar {formatNumber(count)} {count === 1 ? 'assinatura' : 'assinaturas'}
            </Button>
          </>
        )
      }
    >
      {!batchId && (
        <div className="grid gap-3 text-sm">
          <p>
            Grava a assinatura gerada no <strong>endereço principal</strong> do Gmail de <strong className="tabular-nums">{formatNumber(count)}</strong>{' '}
            {count === 1 ? 'pessoa' : 'pessoas'}. A assinatura anterior fica guardada e dá para desfazer pelo painel da pessoa.
          </p>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-primary)]" checked={includePending} onChange={(e) => setIncludePending(e.target.checked)} />
            <span>
              Incluir pendentes
              <span className="block text-xs text-on-surface-variant">Saem sem a parte que falta (ex.: sem celular). Conflito e "sem regra" nunca são gravados.</span>
            </span>
          </label>
          {allowlist.length > 0 && (
            <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <span>
                Modo de teste: só grava para <strong>{allowlist.join(', ')}</strong>. Os demais aparecem como "Pulada".
              </span>
            </p>
          )}
          {notReady && <p className="text-xs text-rose-700 dark:text-rose-300">Google não autorizado: {google.data?.error ?? google.data?.status}</p>}
          {startError && <p className="text-xs text-rose-700 dark:text-rose-300">{startError}</p>}
        </div>
      )}

      {batchId && batch.data && (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>{finished ? 'Concluído' : 'Gravando…'}</span>
              <span className="tabular-nums">
                {formatNumber(batch.data.processed)} de {formatNumber(batch.data.total)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(batch.data.counts) as ApplicationStatus[])
              .filter((status) => batch.data.counts[status] > 0)
              .map((status) => (
                <Badge key={status} tone={TONES[status]}>
                  {APPLICATION_STATUS_LABELS[status]}: {formatNumber(batch.data.counts[status])}
                </Badge>
              ))}
          </div>
          {batch.data.items.some((i) => i.status !== 'APPLIED') && (
            <ul className="max-h-56 divide-y divide-outline-variant overflow-y-auto rounded-md border border-outline-variant text-xs">
              {batch.data.items
                .filter((i) => i.status !== 'APPLIED')
                .map((item) => (
                  <li key={item.collaboratorId} className="flex items-start justify-between gap-2 px-2.5 py-1.5">
                    <span className="min-w-0">
                      <span className="font-medium">{item.name || item.email}</span>
                      <span className="block text-on-surface-variant">{item.reason}</span>
                    </span>
                    <Badge tone={TONES[item.status]}>{APPLICATION_STATUS_LABELS[item.status]}</Badge>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
