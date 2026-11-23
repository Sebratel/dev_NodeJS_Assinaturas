import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
  loading?: boolean;
}

/** Receitas do design system (padroes-frontend §6): alvo de 44 px, transition e focus ring em todo botão. */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-neutral-900 shadow-sm hover:bg-secondary',
  secondary:
    'border border-neutral-200 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low dark:border-white/10',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
  danger: 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200',
};

export function Button({ variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'min-h-[44px] px-4 py-2.5 text-sm' : 'min-h-9 px-3 py-1.5 text-xs',
        VARIANTS[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}
