import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  size?: 'md' | 'lg'
  children: ReactNode
}

/** Modal do design system (§9): backdrop forte, cartão rounded-2xl. */
export function Modal({
  open,
  title,
  onClose,
  footer,
  size = 'md',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-surface-container-lowest shadow-2xl animate-fade-in-up motion-reduce:animate-none dark:border-white/10',
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-11 place-items-center rounded-xl text-on-surface-variant transition hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-outline-variant px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
