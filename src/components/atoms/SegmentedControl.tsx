import type { ReactNode } from 'react';

type Tone = 'amber' | 'blue' | 'violet';
type SegmentedValue = string | number;

interface SegmentedControlItem<T extends SegmentedValue> {
  value: T;
  label: string;
  icon?: ReactNode;
  tone?: Tone;
}

interface SegmentedControlProps<T extends SegmentedValue> {
  value: T;
  items: Array<SegmentedControlItem<T>>;
  onChange: (value: T) => void;
  className?: string;
}

const activeClasses: Record<Tone, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)]',
  amber:
    'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_8px_18px_rgba(245,158,11,0.28)]',
  violet:
    'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_8px_18px_rgba(245,158,11,0.28)]',
};

function SegmentedControl<T extends SegmentedValue>({
  value,
  items,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center rounded-xl p-0.5 theme-card-bg border theme-card-border shadow-[var(--card-shadow)] ${className}`.trim()}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`min-w-[5.25rem] rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
              isActive ? activeClasses[item.tone ?? 'amber'] : 'bg-transparent theme-text-muted'
            }`}
          >
            {item.icon ? <span className="text-[0.8rem] leading-none">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
