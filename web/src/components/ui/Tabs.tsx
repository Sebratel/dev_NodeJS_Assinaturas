import { cn } from '../../utils/cn';

interface TabsProps<T extends string> {
  value: T;
  tabs: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

/** Abas no topo: vinho só na aba ativa (filete embaixo). */
export function Tabs<T extends string>({ value, tabs, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-outline-variant">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors md:min-h-9',
              active ? 'border-primary-ink text-primary-ink' : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
