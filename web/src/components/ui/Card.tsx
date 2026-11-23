import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface CardProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/** Card padrão do design system (§4/§5): rounded-2xl, borda fina, sombra suave. */
export function Card({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: CardProps) {
  return (
    <section
      className={cn(
        'min-w-0 overflow-hidden rounded-2xl border border-neutral-200/90 bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/10',
        className
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="truncate text-xs text-on-surface-variant/80">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
