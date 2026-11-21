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

/** Rótulo + controle + erro. Rótulo sem caixa alta e dica curta (UI compacta). */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('grid min-w-0 gap-1', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-xs font-medium text-on-surface">
        {label}
        {hint && <span className="truncate text-[11px] font-normal text-on-surface-variant">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}
