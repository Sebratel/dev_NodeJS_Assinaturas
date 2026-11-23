import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { findNavItem } from '../../constants/navigation'

interface AppPageHeaderProps {
  /** Texto abaixo do título; sem ele, vale a descrição da seção no menu. */
  description?: ReactNode
  /** Ação principal da página (ex.: "Nova regra"). */
  actions?: ReactNode
}

/** Cabeçalho de página (padroes-frontend §5 › AppPageHeader). Título e ícone vêm da rota. */
export function AppPageHeader({ description, actions }: AppPageHeaderProps) {
  const item = findNavItem(useLocation().pathname)
  if (!item) return null
  const Icon = item.icon

  return (
    <header className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50 via-white to-amber-50/30 shadow-[0_4px_24px_-8px_rgba(180,83,9,0.18)] ring-1 ring-amber-100/80 animate-header-in motion-reduce:animate-none dark:border-amber-400/20 dark:from-amber-950/25 dark:via-surface-container-lowest dark:to-amber-950/10 dark:ring-amber-400/10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-amber-300 to-primary text-neutral-900 shadow-sm ring-1 ring-inset ring-amber-400/40">
          <Icon className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-[12rem] flex-1">
          <h1 className="text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
            {item.label}
          </h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            {description ?? item.description}
          </p>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  )
}
