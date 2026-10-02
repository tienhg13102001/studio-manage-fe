import { CalendarCheck, Check, RotateCcw, X } from 'lucide-react';
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Spinner,
  badgeVariants,
  type ComboboxOption,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import type { User } from '../../../types';
import {
  SCHEDULE_CANCELLED,
  SCHEDULE_CANCELLED_LABEL,
  SHOOT_STATUSES,
  SHOOT_STATUS_LABELS,
  SHOOT_STATUS_VARIANT,
} from '../../../utils/scheduleConstants';
import { CrewAvatar } from './CrewAvatar';
import {
  SHEET_CONTENT_CLS,
  personName,
  type ScheduleFilters,
  type StatusCountKey,
} from './scheduleHelpers';

interface ScheduleFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ScheduleFilters;
  onChange: (patch: Partial<ScheduleFilters>) => void;
  onReset: () => void;
  /** Counts over the loaded rows. */
  counts: Record<StatusCountKey, number>;
  customerOptions: ComboboxOption[];
  photographers: User[];
  total: number;
  loading: boolean;
}

const sectionCls = 'block text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground';
const plainChip =
  'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-[10.5px] py-[4.5px] text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Mobile filter bottom sheet of the schedules page. */
const ScheduleFilterSheet = ({
  open,
  onOpenChange,
  filters,
  onChange,
  onReset,
  counts,
  customerOptions,
  photographers,
  total,
  loading,
}: ScheduleFilterSheetProps) => {
  const allCount = SHOOT_STATUSES.reduce((sum, k) => sum + counts[k], 0) + counts.cancelled;
  const active =
    !!filters.status ||
    !!filters.customer ||
    !!filters.photographer ||
    filters.mine ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className={SHEET_CONTENT_CLS}>
        <div className="flex justify-center" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center">
          <DialogTitle className="flex-1 text-[17px]">Bộ lọc</DialogTitle>
          <DialogClose
            aria-label="Đóng"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        <span id="schedule-filter-status-label" className={sectionCls}>
          Trạng thái
        </span>
        <div
          role="group"
          aria-labelledby="schedule-filter-status-label"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            onClick={() => onChange({ status: '' })}
            aria-pressed={!filters.status}
            className={cn(
              plainChip,
              !filters.status
                ? 'border-transparent bg-foreground text-card'
                : 'border-transparent bg-muted text-muted-foreground',
            )}
          >
            Tất cả <span className="font-bold tabular">{allCount}</span>
          </button>
          {SHOOT_STATUSES.map((st) => {
            const on = filters.status === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => onChange({ status: on ? '' : st })}
                aria-pressed={on}
                className={cn(
                  badgeVariants({ variant: SHOOT_STATUS_VARIANT[st] }),
                  'gap-1.5 border-[1.5px] px-[10.5px] py-[4.5px] text-[12.5px] focus:ring-offset-0',
                  on ? 'border-current' : 'border-transparent',
                )}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                {SHOOT_STATUS_LABELS[st]}
                <span className="font-bold tabular">{counts[st]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() =>
              onChange({ status: filters.status === SCHEDULE_CANCELLED ? '' : SCHEDULE_CANCELLED })
            }
            aria-pressed={filters.status === SCHEDULE_CANCELLED}
            className={cn(
              badgeVariants({ variant: 'neutral' }),
              'gap-1.5 border-[1.5px] px-[10.5px] py-[4.5px] text-[12.5px] focus:ring-offset-0',
              filters.status === SCHEDULE_CANCELLED ? 'border-current' : 'border-transparent',
            )}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {SCHEDULE_CANCELLED_LABEL}
            <span className="font-bold tabular">{counts.cancelled}</span>
          </button>
        </div>

        <span className={sectionCls}>Lớp</span>
        <Combobox
          options={customerOptions}
          value={filters.customer}
          onChange={(v) => onChange({ customer: v })}
          placeholder="Tất cả lớp"
          className="h-[42px] rounded-[10px] bg-card shadow-none"
        />

        <span id="schedule-filter-photographer-label" className={sectionCls}>
          Thợ chụp
        </span>
        <div
          role="group"
          aria-labelledby="schedule-filter-photographer-label"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            onClick={() => onChange({ photographer: '', mine: false })}
            aria-pressed={!filters.photographer && !filters.mine}
            className={cn(
              plainChip,
              'border-transparent bg-muted',
              !filters.photographer && !filters.mine ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            Tất cả
          </button>
          {photographers.map((u) => {
            const on = !filters.mine && filters.photographer === u._id;
            const name = personName(u);
            return (
              <button
                key={u._id}
                type="button"
                onClick={() => onChange({ photographer: on ? '' : u._id, mine: false })}
                aria-pressed={on}
                className={cn(
                  plainChip,
                  'py-[3px] pl-[3px]',
                  on
                    ? 'border-primary bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary'
                    : 'border-transparent bg-muted text-muted-foreground',
                )}
              >
                <CrewAvatar name={name} size={22} className="ring-0" />
                {name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/15 text-primary-700 dark:text-primary">
            <CalendarCheck className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p id="schedule-filter-mine-label" className="text-sm font-semibold text-foreground">
              Lịch của tôi
            </p>
            <p id="schedule-filter-mine-desc" className="text-xs text-muted-foreground">
              Chỉ hiện buổi chụp bạn có trong ekip
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={filters.mine}
            aria-labelledby="schedule-filter-mine-label"
            aria-describedby="schedule-filter-mine-desc"
            onClick={() => onChange({ mine: !filters.mine, photographer: '' })}
            className={cn(
              'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              filters.mine ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform',
                filters.mine ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        <span className={sectionCls}>Khoảng ngày</span>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground/80">Từ ngày</span>
            <DatePicker
              value={filters.dateFrom}
              onChange={(v) => onChange({ dateFrom: v ?? '' })}
              placeholder="Từ ngày"
              className="h-[42px] rounded-[10px] bg-card shadow-none"
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground/80">Đến ngày</span>
            <DatePicker
              value={filters.dateTo}
              onChange={(v) => onChange({ dateTo: v ?? '' })}
              placeholder="Đến ngày"
              className="h-[42px] rounded-[10px] bg-card shadow-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-[42px]"
            disabled={!active}
            onClick={onReset}
          >
            <RotateCcw />
            Xoá bộ lọc
          </Button>
          <Button type="button" className="h-[42px]" onClick={() => onOpenChange(false)}>
            {loading ? <Spinner size="sm" /> : <Check />}
            {loading ? 'Xem kết quả' : `Xem ${total} lịch`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFilterSheet;
