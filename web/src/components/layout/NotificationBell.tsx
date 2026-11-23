import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDismiss } from '../../hooks/useDismiss'
import { useNotifications } from '../../hooks/useNotifications'
import { cn } from '../../utils/cn'

/** Sino com dados reais: aprovação pendente, falhas de gravação, Google e leitura do AD. Vazio = "Tudo em dia". */
export function NotificationBell() {
  const { items, total } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={total > 0 ? `Avisos: ${total}` : 'Avisos: tudo em dia'}
        className="relative grid size-11 place-items-center rounded-xl text-on-surface-variant transition hover:bg-neutral-100 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5"
      >
        <Bell className="size-5" strokeWidth={1.75} aria-hidden />
        {total > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-[18px] text-white">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-surface-container-lowest shadow-2xl animate-fade-in-up motion-reduce:animate-none dark:border-white/10">
          <div className="border-b border-outline-variant px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Avisos
          </div>
          {items.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-on-surface-variant">
              <CheckCircle2
                className="size-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              Tudo em dia.
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-outline-variant overflow-y-auto">
              {items.map((item) => {
                const Icon = item.tone === 'danger' ? XCircle : AlertTriangle
                return (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      onClick={close}
                      className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-container-low"
                    >
                      <Icon
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          item.tone === 'danger'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-on-surface">
                          {item.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-on-surface-variant">
                          {item.detail}
                        </span>
                      </span>
                      <ChevronRight
                        className="mt-0.5 size-4 shrink-0 text-on-surface-variant/60"
                        aria-hidden
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
