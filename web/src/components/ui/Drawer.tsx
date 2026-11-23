import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface DrawerProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  footer?: ReactNode
  width?: 'md' | 'lg'
  children: ReactNode
}

/** Drawer lateral do design system (§9). Fecha com Esc e clique fora. */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  footer,
  width = 'md',
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex h-full w-full flex-col border-l border-neutral-200 bg-surface shadow-2xl animate-slide-in-right motion-reduce:animate-none dark:border-white/10',
          width === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="truncate text-sm text-on-surface-variant/80">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-on-surface-variant transition hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant bg-surface-container-lowest px-5 py-3.5">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  )
}
