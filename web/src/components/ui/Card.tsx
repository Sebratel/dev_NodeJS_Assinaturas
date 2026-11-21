import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** Cabeçalho claro com filete vinho ao lado do título; vinho é acento, não fundo. */
export function Card({ title, subtitle, actions, className, bodyClassName, children }: CardProps) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-4 w-[3px] shrink-0 rounded-full bg-primary-ink" aria-hidden />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{title}</h2>
              {subtitle && <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn('p-3.5', bodyClassName)}>{children}</div>
    </section>
  );
}
