import {
  Combobox,
  DatePicker,
  FilterChip,
  FilterSection,
  FilterSheet,
  SHEET_CONTROL_CLS,
  type ComboboxOption,
} from '@/components/ui';
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
    { v: 'income', label: 'Thu', dot: 'bg-emerald-600' },
    { v: 'expense', label: 'Chi', dot: 'bg-red-600' },
  ];
  const refunds: { v: RefundFilter; label: string; dot?: string }[] = [
    { v: '', label: 'Tất cả' },
    { v: 'done', label: 'Đã hoàn', dot: 'bg-emerald-600' },
    { v: 'pending', label: 'Chưa hoàn', dot: 'bg-amber-600' },
  ];
  return (
    <FilterSheet
      open={open}
      onOpenChange={onOpenChange}
      onReset={onReset}
      canReset={canReset}
      total={total}
      unit="giao dịch"
      loading={loading}
    >
      <FilterSection label="Loại">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <FilterChip
              key={t.v || 'all'}
              active={filters.type === t.v}
              dot={t.dot}
              onClick={() => onChange({ type: t.v })}
            >
              {t.label}
            </FilterChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection label="Kế toán hoàn tiền">
        <div className="flex flex-wrap gap-2">
          {refunds.map((r) => (
            <FilterChip
              key={r.v || 'all'}
              active={filters.refund === r.v}
              dot={r.dot}
              onClick={() => onChange({ refund: r.v })}
            >
              {r.label}
            </FilterChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection label="Lớp">
        <Combobox
          options={customerOptions}
          value={filters.customer}
          onChange={(v) => onChange({ customer: v })}
          placeholder="Tất cả lớp"
          className={SHEET_CONTROL_CLS}
        />
      </FilterSection>

      <FilterSection label="Danh mục">
        <Combobox
          options={categoryOptions}
          value={filters.categoryId}
          onChange={(v) => onChange({ categoryId: v })}
          placeholder="Tất cả danh mục"
          className={SHEET_CONTROL_CLS}
        />
      </FilterSection>

      {userOptions && (
        <FilterSection label="Người thực hiện">
          <Combobox
            options={userOptions}
            value={filters.createdBy}
            onChange={(v) => onChange({ createdBy: v })}
            placeholder="Tất cả"
            className={SHEET_CONTROL_CLS}
          />
        </FilterSection>
      )}

      <FilterSection label="Khoảng ngày">
        <div className="grid grid-cols-2 gap-2.5">
          <DatePicker
            value={filters.dateFrom}
            onChange={(v) => onChange({ dateFrom: v ?? '' })}
            placeholder="Từ ngày"
            className={SHEET_CONTROL_CLS}
          />
          <DatePicker
            value={filters.dateTo}
            onChange={(v) => onChange({ dateTo: v ?? '' })}
            placeholder="Đến ngày"
            className={SHEET_CONTROL_CLS}
          />
        </div>
      </FilterSection>
    </FilterSheet>
  );
};

export default FinanceFilterSheet;
