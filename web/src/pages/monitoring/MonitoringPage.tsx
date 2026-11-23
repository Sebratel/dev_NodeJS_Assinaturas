import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AppPageHeader } from '../../components/layout/AppPageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Tabs } from '../../components/ui/Tabs';
import { automationService } from '../../services/automation.service';
import { queryKeys } from '../../services/query-keys';
import { CoveragePage } from '../coverage/CoveragePage';
import { AutomationCard } from './AutomationCard';
import { RecentApplicationsCard } from './RecentApplicationsCard';
import { RecentEntriesCard } from './RecentEntriesCard';

type TabKey = 'automacao' | 'cobertura';

/** Monitoramento: a gravação automática (gatilhos do AD) e a cobertura das regras. */
export function MonitoringPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get('aba') === 'cobertura' ? 'cobertura' : 'automacao';
  const overview = useQuery({
    queryKey: queryKeys.automation,
    queryFn: automationService.overview,
    enabled: tab === 'automacao',
    refetchInterval: 30_000,
  });

  return (
    <div className="grid gap-4">
      <AppPageHeader />
      <Tabs<TabKey>
        value={tab}
        onChange={(value) => setParams({ aba: value }, { replace: true })}
        tabs={[
          { value: 'automacao', label: 'Automação' },
          { value: 'cobertura', label: 'Cobertura das regras' },
        ]}
      />
      {tab === 'cobertura' && <CoveragePage />}
      {tab === 'automacao' && (
        <>
          {overview.isLoading && <LoadingState />}
          {overview.isError && <ErrorState error={overview.error} onRetry={() => overview.refetch()} />}
          {overview.data && (
            <div className="grid gap-3">
              <AutomationCard overview={overview.data} />
              <RecentEntriesCard overview={overview.data} />
              <RecentApplicationsCard applications={overview.data.recentApplications} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
