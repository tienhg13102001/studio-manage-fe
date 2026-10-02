import type { ReactNode } from 'react';
import { Clock, School, Tag, UserRound, X } from 'lucide-react';
import { Button, Combobox, type ComboboxOption } from '@/components/ui';
import { cn } from '@/lib/utils';
import DateRangeButton from './DateRangeButton';
import type { FinanceFilters, TxType } from './financeHelpers';

export type FinanceTab = 'list' | 'summary';

export const FinanceTabs = ({
  tab,
  onChange,
  className,
}: {
  tab: FinanceTab;
  onChange: (t: FinanceTab) => void;
  className?: string;
}) => (
  <div
    role="tablist"
    className={cn(
      'inline-flex h-[34px] items-center gap-0.5 rounded-[9px] bg-muted p-[3px]',
      className,
    )}
  >
    {(
      [
        { v: 'list', label: 'Danh sách' },
        { v: 'summary', label: 'Tổng hợp theo lớp' },
      ] as const
    ).map((t) => (
      <button
        key={t.v}
        type="button"
        role="tab"
        aria-selected={tab === t.v}
        onClick={() => onChange(t.v)}
        className={cn(
          'h-full flex-1 whitespace-nowrap rounded-[7px] px-3 text-[13px] transition-colors',
          tab === t.v
            ? 'bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {t.label}
      </button>
    ))}
  </div>
);

export const TypeSegmented = ({
  value,
  onChange,
  className,
}: {
  value: TxType;
  onChange: (v: TxType) => void;
  className?: string;
}) => (
  <div
    role="radiogroup"
    aria-label="Loại giao dịch"
    className={cn(
      'inline-flex h-[34px] items-center gap-0.5 rounded-[9px] bg-muted p-[3px]',
      className,
    )}
  >
    {(
      [
        { v: '', label: 'Tất cả' },
        { v: 'income', label: 'Thu', dot: 'bg-emerald-500' },
        { v: 'expense', label: 'Chi', dot: 'bg-rose-500' },
      ] as { v: TxType; label: string; dot?: string }[]
    ).map((t) => (
      <button
        key={t.v || 'all'}
        type="button"
        role="radio"
        aria-checked={value === t.v}
        onClick={() => onChange(t.v)}
        className={cn(
          'inline-flex h-full flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 text-[13px] transition-colors',
          value === t.v
            ? 'bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {t.dot && <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
        {t.label}
      </button>
    ))}
  </div>
);

const IconCombo = ({
  icon,
  options,
  value,
  onChange,
  placeholder,
}: {
  icon: ReactNode;
  options: ComboboxOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
      {icon}
    </span>
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        'h-[34px] w-auto min-w-[130px] max-w-[220px] rounded-[9px] bg-card pl-8 text-[13px] shadow-none',
        value && 'border-primary/50 text-foreground',
      )}
    />
  </div>
);

interface FinanceToolbarProps {
  tab: FinanceTab;
  onTabChange: (t: FinanceTab) => void;
  filters: FinanceFilters;
  onChange: (patch: Partial<FinanceFilters>) => void;
  onReset: () => void;
  canReset: boolean;
  customerOptions: ComboboxOption[];
  categoryOptions: ComboboxOption[];
  /** Omitted when the user only sees their own transactions. */
  userOptions?: ComboboxOption[];
  /** Label when no date range is set (season range). */
  datePlaceholder: string;
}

/** Desktop toolbar: tabs | type · class · category · person · date range · "Xoá lọc". */
const FinanceToolbar = ({
  tab,
  onTabChange,
  filters,
  onChange,
  onReset,
  canReset,
  customerOptions,
  categoryOptions,
  userOptions,
  datePlaceholder,
}: FinanceToolbarProps) => {
  const list = tab === 'list';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FinanceTabs tab={tab} onChange={onTabChange} />
      <span className="mx-1 h-6 w-px bg-border" aria-hidden />
      {list && <TypeSegmented value={filters.type} onChange={(type) => onChange({ type })} />}
      <IconCombo
        icon={<School />}
        options={customerOptions}
        value={filters.customer}
        onChange={(customer) => onChange({ customer })}
        placeholder="Tất cả lớp"
      />
      {list && (
        <IconCombo
          icon={<Tag />}
          options={categoryOptions}
          value={filters.categoryId}
          onChange={(categoryId) => onChange({ categoryId })}
          placeholder="Tất cả danh mục"
        />
      )}
      {list && userOptions && (
        <IconCombo
          icon={<UserRound />}
          options={userOptions}
          value={filters.createdBy}
          onChange={(createdBy) => onChange({ createdBy })}
          placeholder="Người thực hiện"
        />
      )}
      <DateRangeButton
        from={filters.dateFrom}
        to={filters.dateTo}
        onChange={onChange}
        placeholder={datePlaceholder}
      />
      {list && filters.refund && (
        <button
          type="button"
          onClick={() => onChange({ refund: '' })}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-full border border-primary/50 bg-amber-50 px-3 text-[13px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          aria-label="Bỏ lọc hoàn tiền"
        >
          <Clock className="h-3.5 w-3.5" />
          {filters.refund === 'pending' ? 'Chưa hoàn' : 'Đã hoàn'}
          <X className="h-3.5 w-3.5 opacity-70" />
        </button>
      )}
      {canReset && (
        <Button variant="link" className="h-[34px] px-2" onClick={onReset}>
          Xoá lọc
        </Button>
      )}
    </div>
  );
};

export default FinanceToolbar;
