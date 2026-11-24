import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AppPageHeader } from '../../components/layout/AppPageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { Tabs } from '../../components/ui/Tabs'
import { usePermissions } from '../../hooks/usePermissions'
import { queryKeys } from '../../services/query-keys'
import { settingService } from '../../services/setting.service'
import { DirectoryTab } from './DirectoryTab'
import { FieldSourcesTab } from './FieldSourcesTab'
import { GoogleTab } from './GoogleTab'
import { LevelSynonymsTab } from './LevelSynonymsTab'
import { SettingsLockContext } from './settings-lock'
import { TeamsTab } from './TeamsTab'

type TabKey = 'campos' | 'niveis' | 'times' | 'diretorio' | 'google'
const TABS: Array<{ value: TabKey; label: string }> = [
  { value: 'campos', label: 'Origem dos campos' },
  { value: 'niveis', label: 'Níveis do cargo' },
  { value: 'times', label: 'De-para de times' },
  { value: 'diretorio', label: 'Diretório' },
  { value: 'google', label: 'Google' },
]

/** Perfil mínimo para alterar cada aba (a API confere de novo: 403 ROLE_FORBIDDEN). */
const TAB_NEEDS: Record<TabKey, 'Editor' | 'Master'> = {
  campos: 'Master',
  niveis: 'Editor',
  times: 'Editor',
  diretorio: 'Master',
  google: 'Master',
}

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const { canEdit, isMaster } = usePermissions()
  const tab = (
    TABS.some((t) => t.value === params.get('aba'))
      ? params.get('aba')
      : 'campos'
  ) as TabKey
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: settingService.getAll,
  })
  // Remonta as abas quando os dados mudam, para o rascunho local começar do valor salvo.
  const revision = settings.dataUpdatedAt
  const needs = TAB_NEEDS[tab]
  const locked = needs === 'Master' ? !isMaster : !canEdit

  return (
    <div className="grid gap-4">
      <AppPageHeader />
      <Tabs
        value={tab}
        tabs={TABS}
        onChange={(value) => setParams({ aba: value }, { replace: true })}
      />
      {settings.isLoading && <LoadingState />}
      {settings.isError && (
        <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
      )}
      {settings.data && (
        <div
          key={`${tab}-${revision}`}
          className="rounded-2xl border border-neutral-200/90 bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 dark:border-white/10"
        >
          {tab === 'google' ? (
            <GoogleTab />
          ) : (
            <SettingsLockContext.Provider value={locked ? needs : null}>
              <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
                {tab === 'campos' && (
                  <FieldSourcesTab value={settings.data['field-sources']} />
                )}
                {tab === 'niveis' && (
                  <LevelSynonymsTab value={settings.data['level-synonyms']} />
                )}
                {tab === 'times' && (
                  <TeamsTab aliases={settings.data['value-aliases']} />
                )}
                {tab === 'diretorio' && (
                  <DirectoryTab value={settings.data['directory-filters']} />
                )}
              </fieldset>
            </SettingsLockContext.Provider>
          )}
        </div>
      )}
    </div>
  )
}
