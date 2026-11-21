import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { queryKeys } from '../../services/query-keys';
import { googleIntegrationService } from '../../services/report.service';

const STATUS = {
  NOT_CONFIGURED: { label: 'Chave da conta de serviço não configurada', tone: 'neutral' },
  AWAITING_AUTHORIZATION: { label: 'Aguardando autorização do superadmin', tone: 'warning' },
  AUTHORIZED: { label: 'Autorizado', tone: 'success' },
} as const;

export function GoogleTab() {
  const google = useQuery({ queryKey: queryKeys.googleIntegration, queryFn: googleIntegrationService.status });
  if (google.isLoading) return <LoadingState />;
  if (google.isError) return <ErrorState error={google.error} onRetry={() => google.refetch()} />;
  const data = google.data;
  if (!data) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS[data.status].tone}>{STATUS[data.status].label}</Badge>
        {!data.applyEnabled && <span className="text-xs text-on-surface-variant">"Aplicar no Gmail" fica desligado até a autorização.</span>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-on-surface-variant">Projeto no Google Cloud</dt>
        <dd className="font-mono text-xs">{data.projectId ?? '—'}</dd>
        <dt className="text-on-surface-variant">ID do cliente</dt>
        <dd className="font-mono text-xs">{data.clientId ?? '—'}</dd>
        <dt className="text-on-surface-variant">Escopos</dt>
        <dd className="grid gap-0.5 font-mono text-xs">
          {data.scopes.map((scope) => (
            <span key={scope} className="break-all">
              {scope}
            </span>
          ))}
        </dd>
        <dt className="text-on-surface-variant">Chave (JSON)</dt>
        <dd>{data.keyFilePresent ? 'encontrada no servidor' : 'não configurada (GOOGLE_SERVICE_ACCOUNT_KEY_FILE)'}</dd>
      </dl>
      <p className="text-xs text-on-surface-variant">
        O superadmin autoriza em admin.google.com › Segurança › Acesso e controle de dados › Controles de API › Delegação em todo o domínio.
      </p>
    </div>
  );
}
