import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDismiss } from '../../hooks/useDismiss';
import { meService } from '../../services/me.service';
import { queryKeys } from '../../services/query-keys';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Avatar + nome/e-mail/papel; o "Sair" mora aqui (padroes-frontend §16). */
export function ProfileMenu() {
  const { user, status, signOut } = useAuth();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: meService.get, staleTime: 5 * 60_000, retry: false });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  if (!user) return null;
  const local = status === 'local';
  const role = local ? 'Login desligado' : me.data?.isAdmin ? 'Administrador' : 'Acesso liberado';

  const leave = async () => {
    close();
    await signOut();
    queryClient.clear();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menu do perfil"
        className="flex min-h-[44px] items-center gap-2 rounded-xl px-1.5 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5"
      >
        {user.photoUrl ? (
          <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full object-cover ring-2 ring-primary/30" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary-ink ring-2 ring-primary/30">{initials(user.name)}</span>
        )}
        <span className="hidden max-w-[10rem] text-left md:block">
          <span className="block truncate text-sm font-semibold leading-tight text-on-surface">{user.name}</span>
          <span className="block truncate text-[11px] leading-tight text-on-surface-variant">{role}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-neutral-200 bg-surface-container-lowest shadow-2xl animate-fade-in-up motion-reduce:animate-none dark:border-white/10">
          <div className="px-4 py-3">
            <div className="truncate text-sm font-semibold text-on-surface">{user.name}</div>
            <div className="truncate text-xs text-on-surface-variant">{local ? 'Ambiente local, sem login (AUTH_ENABLED=false)' : user.email}</div>
            <span className="mt-2 inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-ink">
              {role}
            </span>
          </div>
          {!local && (
            <button
              type="button"
              onClick={() => void leave()}
              className="flex min-h-[44px] w-full items-center gap-2 border-t border-outline-variant px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          )}
        </div>
      )}
    </div>
  );
}
