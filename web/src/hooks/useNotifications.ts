import { useQuery } from '@tanstack/react-query';
import { automationService } from '../services/automation.service';
import { queryKeys } from '../services/query-keys';
import { directoryService, googleIntegrationService } from '../services/report.service';

export interface NotificationItem {
  id: string;
  tone: 'danger' | 'warning';
  title: string;
  detail: string;
  to: string;
}

const FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Sino do topo (padroes-frontend §16): só fontes reais, cada item leva à tela que resolve.
 * Usa as mesmas chaves das telas, então não duplica requisição.
 */
export function useNotifications(): { items: NotificationItem[]; total: number; isLoading: boolean } {
  const automation = useQuery({ queryKey: queryKeys.automation, queryFn: automationService.overview, refetchInterval: 60_000 });
  const directory = useQuery({ queryKey: queryKeys.directoryStatus, queryFn: directoryService.status, refetchInterval: 60_000 });
  const google = useQuery({ queryKey: queryKeys.googleIntegration, queryFn: googleIntegrationService.status, staleTime: 5 * 60_000 });

  const items: NotificationItem[] = [];

  const pending = automation.data?.pendingApproval;
  if (pending) {
    items.push({
      id: 'automation-approval',
      tone: 'warning',
      title: 'Gravação aguardando aprovação',
      detail: `${pending.newcomers} novo(s) e ${pending.changes} mudança(s) passaram do limite da rodada.`,
      to: '/monitoramento',
    });
  }

  if (automation.data?.lastRun?.outcome === 'ERROR') {
    items.push({ id: 'automation-error', tone: 'danger', title: 'A automação falhou', detail: automation.data.lastRun.message, to: '/monitoramento' });
  }

  // Janela contada a partir da última leitura (render puro, sem Date.now()).
  const since = automation.dataUpdatedAt - FAILURE_WINDOW_MS;
  const failures = (automation.data?.recentApplications ?? []).filter((a) => a.status === 'FAILED' && Date.parse(a.createdAt) >= since);
  if (failures.length > 0) {
    items.push({
      id: 'applications-failed',
      tone: 'danger',
      title: `${failures.length} gravação(ões) com falha`,
      detail: `Nas últimas 24 h. Última: ${failures[0].collaboratorName}.`,
      to: '/monitoramento',
    });
  }

  if (google.data && google.data.status !== 'AUTHORIZED') {
    items.push({
      id: 'google-not-authorized',
      tone: 'danger',
      title: google.data.status === 'NOT_CONFIGURED' ? 'Google não configurado' : 'Google sem autorização',
      detail: 'Sem isso nenhuma assinatura é gravada no Gmail.',
      to: '/configuracoes?aba=google',
    });
  }

  if (directory.data?.lastError) {
    items.push({ id: 'directory-error', tone: 'danger', title: 'Falha ao ler o AD', detail: directory.data.lastError, to: '/configuracoes?aba=diretorio' });
  }

  return { items, total: items.length, isLoading: automation.isLoading || directory.isLoading || google.isLoading };
}
