import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Rótulo do design system (caixa alta espaçada, §7) + controle + dica + erro. */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('grid min-w-0 gap-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
        {hint && <span className="truncate text-[11px] font-medium normal-case tracking-normal text-on-surface-variant/70">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}
