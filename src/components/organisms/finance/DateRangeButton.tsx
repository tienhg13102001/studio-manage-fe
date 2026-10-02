import { CalendarDays, ChevronDown } from 'lucide-react';
import { DatePicker, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import { rangeLabel } from './financeHelpers';

interface DateRangeButtonProps {
  from: string;
  to: string;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
  /** Shown when no range is set (e.g. the season range). */
  placeholder: string;
  className?: string;
}

/** One toolbar control for a date range: "01/09 – 30/09/2026" → popover with two DatePickers. */
const DateRangeButton = ({ from, to, onChange, placeholder, className }: DateRangeButtonProps) => {
  const label = rangeLabel(from, to);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-[9px] border bg-card px-3 text-[13px] transition-colors hover:bg-muted/60',
            label ? 'text-foreground' : 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="tabular">{label || placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] space-y-3 rounded-[12px] p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Từ ngày</span>
            <DatePicker
              value={from}
              onChange={(v) => onChange({ dateFrom: v ?? '', dateTo: to })}
              placeholder="Từ ngày"
              className="h-9 rounded-[9px]"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Đến ngày</span>
            <DatePicker
              value={to}
              onChange={(v) => onChange({ dateFrom: from, dateTo: v ?? '' })}
              placeholder="Đến ngày"
              className="h-9 rounded-[9px]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Để trống = theo mùa đang chọn</span>
          {(from || to) && (
            <button
              type="button"
              className="font-semibold text-primary-700 hover:underline dark:text-primary"
              onClick={() => onChange({ dateFrom: '', dateTo: '' })}
            >
              Xoá
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeButton;
