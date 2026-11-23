import { useEffect, useState, type CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { BREAKPOINT_PX } from '../../constants/breakpoints';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const COLLAPSED_KEY = 'sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function saveCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    /* navegação privada: só não lembra */
  }
}

/** Casca da aplicação (padroes-frontend §16): topo fixo + menu lateral encostado; no celular, o menu vira gaveta. */
export function RootLayout() {
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINT_PX.xl}px)`);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarCollapsed = isDesktop && collapsed;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const onMenuClick = () => {
    if (!isDesktop) {
      setDrawerOpen((open) => !open);
      return;
    }
    setCollapsed((value) => {
      saveCollapsed(!value);
      return !value;
    });
  };

  return (
    // --sidebar-w: largura do menu no desktop; barras fixas (ex.: lote de Colaboradores) usam xl:left-(--sidebar-w).
    <div className="flex min-h-dvh bg-surface text-on-surface" style={{ '--sidebar-w': sidebarCollapsed ? '5rem' : '15.5rem' } as CSSProperties}>
      <Topbar onMenuClick={onMenuClick} menuExpanded={isDesktop ? !collapsed : drawerOpen} />
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={!isDesktop && drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div
        className={cn(
          'min-w-0 flex-1 transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          sidebarCollapsed ? 'xl:ml-20' : 'xl:ml-[15.5rem]',
        )}
      >
        <main className="px-4 pb-12 pt-[calc(3.5rem+env(safe-area-inset-top)+1rem)] sm:px-6 xl:px-8 xl:pt-[5rem]">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
