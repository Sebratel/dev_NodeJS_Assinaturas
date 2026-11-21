import { cn } from '../../utils/cn';

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** Controle segmentado: trilho neutro, opção escolhida em relevo branco com letra vinho. */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap gap-0.5 rounded-lg bg-surface-container-low p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-9 rounded-md px-2.5 text-xs font-medium transition-colors md:min-h-7',
              selected ? 'bg-surface-container-lowest text-primary-ink shadow-sm dark:bg-white/10' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
