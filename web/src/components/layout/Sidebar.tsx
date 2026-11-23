import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, RefreshCw, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/navigation';
import { derivedQueryRoots, queryKeys } from '../../services/query-keys';
import { directoryService } from '../../services/report.service';
import { cn } from '../../utils/cn';
import { formatRelative } from '../../utils/format';

const SOURCE_LABELS = { SNAPSHOT: 'arquivo local', LDAP: 'LDAP', WINDOWS_LOGIN: 'ao vivo' } as const;

interface SidebarProps {
  /** Só no desktop: mostra só os ícones (xl:w-20). */
  collapsed: boolean;
  /** Só no celular: gaveta aberta. */
  mobileOpen: boolean;
  onClose: () => void;
}

/** Menu lateral encostado abaixo do topo (xl) e gaveta no celular (padroes-frontend §5 e §16). */
export function Sidebar({ collapsed, mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-[45] bg-neutral-950/40 backdrop-blur-[2px] xl:hidden" onClick={onClose} aria-hidden />}

      <aside
        aria-label="Menu principal"
        className={cn(
          'fixed z-50 flex flex-col border-neutral-200 bg-surface-container-lowest transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:border-white/10',
          'max-xl:inset-y-0 max-xl:left-0 max-xl:w-[min(20rem,90vw)] max-xl:pt-[env(safe-area-inset-top)] max-xl:shadow-2xl',
          mobileOpen ? 'max-xl:translate-x-0' : 'max-xl:-translate-x-full',
          'xl:bottom-0 xl:left-0 xl:top-14 xl:z-30 xl:border-r',
          collapsed ? 'xl:w-20' : 'xl:w-[15.5rem]',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 xl:hidden dark:border-white/10">
          <img src="/sebratel-icone.png" alt="" className="size-8 rounded-lg object-contain" />
          <span className="flex-1 text-sm font-bold tracking-tight">Assinaturas</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar o menu"
            className="grid size-11 place-items-center rounded-xl text-on-surface-variant transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <nav className={cn('flex flex-1 flex-col gap-1 overflow-y-auto py-4', collapsed ? 'xl:px-3' : 'px-3')}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  collapsed && 'xl:justify-center xl:px-0',
                  isActive
                    ? 'bg-primary text-neutral-900 shadow-lg shadow-primary/20'
                    : 'text-on-surface-variant hover:bg-neutral-100 hover:text-on-surface dark:hover:bg-white/5',
                )
              }
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className={cn('truncate', collapsed && 'xl:sr-only')}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <DirectoryStatusFooter collapsed={collapsed} />
      </aside>
    </>
  );
}

/** Rodapé do menu: de onde vem o AD, quando foi lido, e o botão de ler agora. */
function DirectoryStatusFooter({ collapsed }: { collapsed: boolean }) {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: queryKeys.directoryStatus, queryFn: directoryService.status, refetchInterval: 60_000 });
  const sync = useMutation({
    mutationFn: directoryService.sync,
    onSuccess: () => derivedQueryRoots.forEach((queryKey) => queryClient.invalidateQueries({ queryKey })),
  });
  const dir = status.data;
  const failed = Boolean(dir?.lastError);
  const people = dir ? `${dir.collaborators} pessoas` : 'Lendo…';
  const when = dir ? `${failed ? 'falhou' : 'lido'} ${formatRelative(dir.lastSyncAt)}` : '';
  const summary = when ? `${people} · ${when}` : people;

  return (
    <div className={cn('border-t border-neutral-200 p-3 dark:border-white/10', collapsed && 'xl:px-2')}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl px-2 py-2',
          failed ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-surface-container-low text-on-surface-variant',
          collapsed && 'xl:flex-col xl:px-0',
        )}
        title={dir?.lastError ?? summary}
      >
        <Database className="size-4 shrink-0" aria-hidden />
        <div className={cn('min-w-0 flex-1 text-xs leading-tight', collapsed && 'xl:sr-only')}>
          <div className="font-bold uppercase tracking-wider">AD {dir ? `· ${SOURCE_LABELS[dir.source]}` : ''}</div>
          <div className="truncate">{people}</div>
          {when && <div className="truncate">{when}</div>}
        </div>
        <button
          type="button"
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          aria-label="Ler o AD agora"
          title="Ler o AD agora"
          className="grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-neutral-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn('size-4', sync.isPending && 'animate-spin motion-reduce:animate-none')} aria-hidden />
        </button>
      </div>
    </div>
  );
}
