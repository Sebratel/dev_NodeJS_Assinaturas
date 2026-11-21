import type { ReactNode } from 'react';
import type { SignatureStatus } from '../../types/api';
import { cn } from '../../utils/cn';
import { STATUS_LABELS } from '../../utils/labels';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-outline-variant bg-surface-container-low text-on-surface-variant',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200',
  info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-200',
  brand: 'border-primary-ink/25 bg-primary-soft text-primary-ink',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-px text-[11px] font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}

export const STATUS_TONES: Record<SignatureStatus, BadgeTone> = {
  READY: 'success',
  PENDING: 'warning',
  CONFLICT: 'danger',
  NO_RULE: 'neutral',
};

export function StatusBadge({ status }: { status: SignatureStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
