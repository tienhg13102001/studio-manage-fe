import { Check, RotateCcw, X } from 'lucide-react';
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Spinner,
  type ComboboxOption,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { SHEET_CONTENT_CLS } from '../schedules/scheduleHelpers';
import type { FinanceFilters, RefundFilter, TxType } from './financeHelpers';

interface FinanceFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FinanceFilters;
  onChange: (patch: Partial<FinanceFilters>) => void;
  onReset: () => void;
  canReset: boolean;
  customerOptions: ComboboxOption[];
  categoryOptions: ComboboxOption[];
  /** Omitted when the user only sees their own transactions. */
  userOptions?: ComboboxOption[];
  total: number;
  loading: boolean;
}

const sectionCls = 'block text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground';
const selectCls = 'h-[42px] rounded-[10px] bg-card shadow-none';

const Chip = ({
  active,
  dot,
  onClick,
  children,
}: {
  active: boolean;
  dot?: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-[5px] text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active
        ? 'border-primary bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary'
        : 'border-transparent bg-muted text-muted-foreground',
    )}
  >
    {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
    {children}
  </button>
);

/** Mobile filter bottom sheet of the finance page. */
const FinanceFilterSheet = ({
  open,
  onOpenChange,
  filters,
  onChange,
  onReset,
  canReset,
  customerOptions,
  categoryOptions,
  userOptions,
  total,
  loading,
}: FinanceFilterSheetProps) => {
  const types: { v: TxType; label: string; dot?: string }[] = [
    { v: '', label: 'Tất cả' },
    { v: 'income', label: 'Thu', dot: 'bg-emerald-500' },
    { v: 'expense', label: 'Chi', dot: 'bg-rose-500' },
  ];
  const refunds: { v: RefundFilter; label: string; dot?: string }[] = [
    { v: '', label: 'Tất cả' },
    { v: 'done', label: 'Đã hoàn', dot: 'bg-emerald-500' },
    { v: 'pending', label: 'Chưa hoàn', dot: 'bg-amber-600' },
  ];
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

        <span className={sectionCls}>Loại</span>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <Chip
              key={t.v || 'all'}
              active={filters.type === t.v}
              dot={t.dot}
              onClick={() => onChange({ type: t.v })}
            >
              {t.label}
            </Chip>
          ))}
        </div>

        <span className={sectionCls}>KT hoàn tiền</span>
        <div className="flex flex-wrap gap-2">
          {refunds.map((r) => (
            <Chip
              key={r.v || 'all'}
              active={filters.refund === r.v}
              dot={r.dot}
              onClick={() => onChange({ refund: r.v })}
            >
              {r.label}
            </Chip>
          ))}
        </div>

        <span className={sectionCls}>Lớp</span>
        <Combobox
          options={customerOptions}
          value={filters.customer}
          onChange={(v) => onChange({ customer: v })}
          placeholder="Tất cả lớp"
          className={selectCls}
        />

        <span className={sectionCls}>Danh mục</span>
        <Combobox
          options={categoryOptions}
          value={filters.categoryId}
          onChange={(v) => onChange({ categoryId: v })}
          placeholder="Tất cả danh mục"
          className={selectCls}
        />

        {userOptions && (
          <>
            <span className={sectionCls}>Người thực hiện</span>
            <Combobox
              options={userOptions}
              value={filters.createdBy}
              onChange={(v) => onChange({ createdBy: v })}
              placeholder="Tất cả"
              className={selectCls}
            />
          </>
        )}

        <span className={sectionCls}>Khoảng ngày</span>
        <div className="grid grid-cols-2 gap-2.5">
          <DatePicker
            value={filters.dateFrom}
            onChange={(v) => onChange({ dateFrom: v ?? '' })}
            placeholder="Từ ngày"
            className={selectCls}
          />
          <DatePicker
            value={filters.dateTo}
            onChange={(v) => onChange({ dateTo: v ?? '' })}
            placeholder="Đến ngày"
            className={selectCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-[42px]"
            disabled={!canReset}
            onClick={onReset}
          >
            <RotateCcw />
            Xoá bộ lọc
          </Button>
          <Button type="button" className="h-[42px]" onClick={() => onOpenChange(false)}>
            {loading ? <Spinner size="sm" /> : <Check />}
            {loading ? 'Xem kết quả' : `Xem ${total} giao dịch`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceFilterSheet;
