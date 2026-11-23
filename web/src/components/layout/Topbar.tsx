import { Menu, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { findNavItem } from '../../constants/navigation';
import { getPreferredTheme, toggleTheme, type ThemeMode } from '../../utils/theme';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';

const ICON_BUTTON =
  'grid size-11 shrink-0 place-items-center rounded-xl text-on-surface-variant transition hover:bg-neutral-100 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5';

interface TopbarProps {
  onMenuClick: () => void;
  menuExpanded: boolean;
}

/** Topo global (padroes-frontend §16): menu, logo, breadcrumb app › página; à direita tema, sino e perfil. */
export function Topbar({ onMenuClick, menuExpanded }: TopbarProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getPreferredTheme());
  const page = findNavItem(useLocation().pathname);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-1 border-b border-neutral-200 bg-surface-container-lowest/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:gap-2 sm:px-3 dark:border-white/10">
      <button type="button" onClick={onMenuClick} aria-expanded={menuExpanded} aria-label={menuExpanded ? 'Recolher o menu' : 'Abrir o menu'} className={ICON_BUTTON}>
        <Menu className="size-5" strokeWidth={1.75} aria-hidden />
      </button>

      <Link to="/" className="flex shrink-0 items-center gap-2 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <img src="/sebratel-icone.png" alt="Sebratel" className="size-8 rounded-lg object-contain" />
        <span className="hidden text-sm font-bold tracking-tight text-on-surface md:inline">Assinaturas</span>
      </Link>

      <nav aria-label="Você está em" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="hidden text-on-surface-variant/50 md:inline" aria-hidden>
          ›
        </span>
        <span className="truncate font-semibold text-on-surface" aria-current="page">
          {page?.label ?? ''}
        </span>
      </nav>

      <button
        type="button"
        onClick={() => setThemeState(toggleTheme())}
        className={ICON_BUTTON}
        aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      >
        {theme === 'dark' ? <Sun className="size-5" strokeWidth={1.75} aria-hidden /> : <Moon className="size-5" strokeWidth={1.75} aria-hidden />}
      </button>
      <NotificationBell />
      <ProfileMenu />
    </header>
  );
}
