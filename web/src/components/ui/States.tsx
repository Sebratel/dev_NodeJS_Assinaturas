import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** Estados do design system (§11). Lottie fica para depois: por ora, spinner com o mesmo container. */
export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-3xl bg-surface-container-low px-8 py-12 text-sm text-on-surface-variant" role="status" aria-live="polite">
      <Spinner className="size-5" /> {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-1 rounded-3xl bg-surface-container-low px-8 py-12 text-center">
      <Inbox className="mb-1 size-6 text-on-surface-variant" aria-hidden />
      <p className="text-lg font-bold tracking-tight text-on-surface">{title}</p>
      {children && <div className="mt-1 text-sm text-on-surface-variant/80">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Algo deu errado.';
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-2 rounded-xl border border-rose-200/90 bg-rose-50/95 px-3 py-2.5 text-sm text-rose-900 shadow-sm dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
