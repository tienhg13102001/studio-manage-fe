import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SegmentedValue = string | number;

export interface SegmentedItem<T extends SegmentedValue> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends SegmentedValue> {
  value: T;
  items: SegmentedItem<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends SegmentedValue>({
  value,
  items,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[10px] bg-muted p-[3px]',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              'min-w-[5rem] rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200 inline-flex items-center justify-center gap-1.5',
              isActive
                ? 'bg-card text-foreground font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                : 'bg-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon ? <span className="text-[0.8rem] leading-none">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
