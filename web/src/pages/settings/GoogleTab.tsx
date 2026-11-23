import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { queryKeys } from '../../services/query-keys';
import { googleIntegrationService } from '../../services/report.service';

const STATUS = {
  NOT_CONFIGURED: { label: 'Chave da conta de serviço não configurada', tone: 'neutral' },
  NOT_AUTHORIZED: { label: 'Delegação recusada pelo Google', tone: 'danger' },
  AUTHORIZED: { label: 'Autorizado: pode gravar no Gmail', tone: 'success' },
} as const;

export function GoogleTab() {
  const queryClient = useQueryClient();
  const google = useQuery({ queryKey: queryKeys.googleIntegration, queryFn: googleIntegrationService.status });
  const check = useMutation({
    mutationFn: googleIntegrationService.check,
    onSuccess: (data) => queryClient.setQueryData(queryKeys.googleIntegration, data),
  });
  if (google.isLoading) return <LoadingState />;
  if (google.isError) return <ErrorState error={google.error} onRetry={() => google.refetch()} />;
  const data = google.data;
  if (!data) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS[data.status].tone}>{STATUS[data.status].label}</Badge>
        <Button size="sm" variant="ghost" icon={<RefreshCw className="size-3.5" />} loading={check.isPending} onClick={() => check.mutate()}>
          Testar de novo
        </Button>
      </div>
      {data.error && <p className="text-xs text-rose-700 dark:text-rose-300">{data.error}</p>}
      {data.applyAllowlist.length > 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
          Modo de teste: só grava para <strong>{data.applyAllowlist.join(', ')}</strong> (GOOGLE_APPLY_ALLOWLIST). Para liberar todos, esvazie a variável e reinicie a API.
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-on-surface-variant">Projeto no Google Cloud</dt>
        <dd className="font-mono text-xs">{data.projectId ?? '—'}</dd>
        <dt className="text-on-surface-variant">ID do cliente</dt>
        <dd className="font-mono text-xs">{data.clientId ?? '—'}</dd>
        <dt className="text-on-surface-variant">Testado como</dt>
        <dd className="font-mono text-xs">{data.testUser ?? '—'}</dd>
        <dt className="text-on-surface-variant">Escopos</dt>
        <dd className="grid gap-0.5 font-mono text-xs">
          {data.scopes.map((scope) => (
            <span key={scope} className="break-all">
              {scope}
            </span>
          ))}
        </dd>
        <dt className="text-on-surface-variant">Chave (JSON)</dt>
        <dd>{data.keyFilePresent ? 'encontrada' : 'não configurada (GOOGLE_SERVICE_ACCOUNT_KEY_FILE)'}</dd>
      </dl>
    </div>
  );
}
