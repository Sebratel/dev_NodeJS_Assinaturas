import { BarChart3, Settings2, SlidersHorizontal, Users } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { Topbar } from './Topbar';

export const NAV_ITEMS = [
  { to: '/colaboradores', label: 'Colaboradores', icon: Users },
  { to: '/regras', label: 'Regras', icon: SlidersHorizontal },
  { to: '/cobertura', label: 'Cobertura', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings2 },
];

export function AppShell() {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.to));

  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <Topbar pageTitle={current?.label ?? ''} />

      <nav
        aria-label="Seções"
        className="fixed inset-x-0 top-14 z-30 flex gap-1 overflow-x-auto border-b border-outline-variant bg-surface-container-lowest px-3 py-1.5 lg:bottom-0 lg:right-auto lg:w-52 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-2 lg:py-3"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors lg:min-h-9',
                isActive ? 'bg-primary-soft text-primary-ink' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
              )
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="px-4 pb-10 pt-[7.5rem] lg:ml-52 lg:px-6 lg:pt-[4.75rem]">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
