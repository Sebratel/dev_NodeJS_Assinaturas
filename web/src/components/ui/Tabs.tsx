import { cn } from '../../utils/cn'

interface TabsProps<T extends string> {
  value: T
  tabs: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}

/** Abas em pílula; a ativa em âmbar cheio, como o item ativo do menu (§5). */
export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className="flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-2xl bg-surface-container-low p-1.5"
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'bg-primary text-neutral-900 shadow-lg shadow-primary/20'
                : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
