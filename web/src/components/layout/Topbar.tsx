import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Moon, PenLine, RefreshCw, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { directoryService } from '../../services/report.service';
import { derivedQueryRoots, queryKeys } from '../../services/query-keys';
import { cn } from '../../utils/cn';
import { formatRelative } from '../../utils/format';
import { getPreferredTheme, toggleTheme, type ThemeMode } from '../../utils/theme';

const SOURCE_LABELS = { SNAPSHOT: '(arquivo local)', LDAP: '(LDAP)', WINDOWS_LOGIN: '(ao vivo)' } as const;

export function Topbar({ pageTitle }: { pageTitle: string }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getPreferredTheme());
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: queryKeys.directoryStatus, queryFn: directoryService.status, refetchInterval: 60_000 });
  const sync = useMutation({
    mutationFn: directoryService.sync,
    onSuccess: () => derivedQueryRoots.forEach((queryKey) => queryClient.invalidateQueries({ queryKey })),
  });

  const dir = status.data;
  const failed = Boolean(dir?.lastError);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-outline-variant bg-surface-container-lowest/95 px-3 backdrop-blur-md lg:px-4">
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-primary text-on-primary">
          <PenLine className="size-4" aria-hidden />
        </span>
        <span className="hidden text-sm font-bold tracking-tight sm:inline">Assinaturas</span>
      </Link>
      <span className="hidden text-on-surface-variant/50 sm:inline" aria-hidden>
        ›
      </span>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{pageTitle}</h1>

      <div
        className={cn(
          'hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs md:flex',
          failed
            ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200'
            : 'border-outline-variant text-on-surface-variant',
        )}
        title={dir?.lastError ?? undefined}
      >
        <Database className="size-3.5" aria-hidden />
        {dir ? (
          <>
            AD {SOURCE_LABELS[dir.source]} · {dir.collaborators} pessoas · {failed ? 'falhou' : 'lido'} {formatRelative(dir.lastSyncAt)}
          </>
        ) : (
          'AD…'
        )}
      </div>
      <button
        type="button"
        onClick={() => sync.mutate()}
        disabled={sync.isPending}
        className="grid size-11 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 md:size-8"
        title="Ler o AD agora"
        aria-label="Ler o AD agora"
      >
        <RefreshCw className={cn('size-4', sync.isPending && 'animate-spin motion-reduce:animate-none')} />
      </button>
      <button
        type="button"
        onClick={() => setThemeState(toggleTheme())}
        className="grid size-11 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-low md:size-8"
        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      <span className="hidden rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[11px] font-medium text-amber-950 lg:inline dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
        Local · sem login
      </span>
    </header>
  );
}
