import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AppPageHeader } from '../../components/layout/AppPageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Tabs } from '../../components/ui/Tabs';
import { queryKeys } from '../../services/query-keys';
import { settingService } from '../../services/setting.service';
import { DirectoryTab } from './DirectoryTab';
import { FieldSourcesTab } from './FieldSourcesTab';
import { GoogleTab } from './GoogleTab';
import { LevelSynonymsTab } from './LevelSynonymsTab';
import { TeamsTab } from './TeamsTab';

type TabKey = 'campos' | 'niveis' | 'times' | 'diretorio' | 'google';
const TABS: Array<{ value: TabKey; label: string }> = [
  { value: 'campos', label: 'Origem dos campos' },
  { value: 'niveis', label: 'Níveis do cargo' },
  { value: 'times', label: 'De-para de times' },
  { value: 'diretorio', label: 'Diretório' },
  { value: 'google', label: 'Google' },
];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.value === params.get('aba')) ? params.get('aba') : 'campos') as TabKey;
  const settings = useQuery({ queryKey: queryKeys.settings, queryFn: settingService.getAll });
  // Remonta as abas quando os dados mudam, para o rascunho local começar do valor salvo.
  const revision = settings.dataUpdatedAt;

  return (
    <div className="grid gap-4">
      <AppPageHeader />
      <Tabs value={tab} tabs={TABS} onChange={(value) => setParams({ aba: value }, { replace: true })} />
      {settings.isLoading && <LoadingState />}
      {settings.isError && <ErrorState error={settings.error} onRetry={() => settings.refetch()} />}
      {settings.data && (
        <div
          key={`${tab}-${revision}`}
          className="rounded-2xl border border-neutral-200/90 bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 dark:border-white/10"
        >
          {tab === 'campos' && <FieldSourcesTab value={settings.data['field-sources']} />}
          {tab === 'niveis' && <LevelSynonymsTab value={settings.data['level-synonyms']} />}
          {tab === 'times' && <TeamsTab aliases={settings.data['value-aliases']} />}
          {tab === 'diretorio' && <DirectoryTab value={settings.data['directory-filters']} />}
          {tab === 'google' && <GoogleTab />}
        </div>
      )}
    </div>
  );
}
