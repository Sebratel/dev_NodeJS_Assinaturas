import type { ReactNode } from 'react'
import type { SignatureStatus } from '../../types/api'
import { cn } from '../../utils/cn'
import { STATUS_LABELS, STATUS_TONES } from '../../utils/labels'

export type BadgeTone =
  'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

/** Pílulas do design system (§8): marca em âmbar, status na paleta Tailwind com variante dark. */
const TONES: Record<BadgeTone, string> = {
  neutral:
    'border-neutral-200 bg-surface-container-low text-on-surface-variant dark:border-white/10',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200',
  danger:
    'border-rose-200/90 bg-rose-50 text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200',
  info: 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-200',
  brand: 'border-primary/25 bg-primary/10 text-primary-ink',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: SignatureStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
}
