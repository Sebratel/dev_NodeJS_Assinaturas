import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  width?: 'md' | 'lg';
  children: ReactNode;
}

/** Painel lateral. Fecha com Esc e clique fora. */
export function Drawer({ open, title, subtitle, onClose, footer, width = 'md', children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex h-full w-full flex-col border-l border-outline-variant bg-surface shadow-2xl animate-slide-in-right motion-reduce:animate-none',
          width === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            {subtitle && <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-low md:size-8"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant bg-surface-container-lowest px-4 py-3">{footer}</footer>}
      </aside>
    </div>
  );
}
