import { cn } from '../../utils/cn'

interface SegmentedProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  ariaLabel: string
}

/** Controle segmentado em pílulas: a opção escolhida com o tom da marca (§8). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-full bg-surface-container-low p-1"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-9 rounded-full px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              selected
                ? 'bg-primary text-neutral-900 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
