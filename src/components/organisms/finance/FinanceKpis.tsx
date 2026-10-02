import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EXPENSE_TEXT,
  INCOME_TEXT,
  formatPct,
  marginPct,
  money,
  shortMoney,
  type FinanceKpi,
} from './financeHelpers';

interface FinanceKpisProps {
  kpi: FinanceKpi;
  /** Mobile: compact cards in a horizontal scroller. */
  compact: boolean;
  pendingActive: boolean;
  onPendingClick: () => void;
}

const Pill = ({
  icon,
  iconCls,
  label,
  value,
  valueCls,
  hint,
  className,
}: {
  icon: ReactNode;
  iconCls: string;
  label: string;
  value: string;
  valueCls?: string;
  hint?: string;
  className?: string;
}) => (
  <div
    className={cn(
      'flex h-[52px] min-w-0 items-center gap-3 rounded-[12px] border bg-card px-3',
      className,
    )}
  >
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:h-4 [&_svg]:w-4',
        iconCls,
      )}
    >
      {icon}
    </span>
    <div className="min-w-0 leading-tight">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className={cn('truncate text-[15px] font-bold tabular', valueCls)}>{value}</span>
        {hint && (
          <span className="hidden shrink-0 text-xs text-muted-foreground tabular xl:inline">
            {hint}
          </span>
        )}
      </div>
    </div>
  </div>
);

/** Tổng thu · Tổng chi · Lợi nhuận · Chưa hoàn tiền (follows season / date range only). */
const FinanceKpis = ({ kpi, compact, pendingActive, onPendingClick }: FinanceKpisProps) => {
  const profit = kpi.income - kpi.expense;
  const margin = marginPct(profit, kpi.income);
  const fmt = compact ? (n: number) => `${shortMoney(n)} ₫` : money;

  if (compact) {
    const card = 'w-[150px] shrink-0 rounded-[12px] border bg-card px-3 py-2';
    return (
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className={card}>
          <div className="text-xs text-muted-foreground">Tổng thu</div>
          <div className={cn('text-[15px] font-bold tabular', INCOME_TEXT)}>{fmt(kpi.income)}</div>
          <div className="text-[11px] text-muted-foreground">{kpi.incomeCount} GD</div>
        </div>
        <div className={card}>
          <div className="text-xs text-muted-foreground">Tổng chi</div>
          <div className={cn('text-[15px] font-bold tabular', EXPENSE_TEXT)}>
            {fmt(kpi.expense)}
          </div>
          <div className="text-[11px] text-muted-foreground">{kpi.expenseCount} GD</div>
        </div>
        <div className={card}>
          <div className="text-xs text-muted-foreground">Lợi nhuận</div>
          <div className={cn('text-[15px] font-bold tabular', profit < 0 && EXPENSE_TEXT)}>
            {fmt(profit)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {margin !== null ? `Biên ${formatPct(margin)}` : '—'}
          </div>
        </div>
        <button
          type="button"
          onClick={onPendingClick}
          aria-pressed={pendingActive}
          className={cn(
            card,
            'border-primary/50 bg-amber-50 text-left dark:bg-amber-500/10',
            pendingActive && 'ring-2 ring-primary/40',
          )}
        >
          <div className="text-xs text-amber-800 dark:text-amber-300">Chưa hoàn tiền</div>
          <div className="text-[15px] font-bold text-amber-800 tabular dark:text-amber-300">
            {fmt(kpi.pendingRefund)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {kpi.pendingRefundCount} khoản · Xem
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      <Pill
        icon={<ArrowDownLeft />}
        iconCls="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        label="Tổng thu"
        value={money(kpi.income)}
        valueCls={INCOME_TEXT}
        hint={`${kpi.incomeCount} GD`}
      />
      <Pill
        icon={<ArrowUpRight />}
        iconCls="bg-rose-500/15 text-rose-700 dark:text-rose-300"
        label="Tổng chi"
        value={money(kpi.expense)}
        valueCls={EXPENSE_TEXT}
        hint={`${kpi.expenseCount} GD`}
      />
      <Pill
        icon={<TrendingUp />}
        iconCls="bg-blue-500/15 text-blue-700 dark:text-blue-300"
        label="Lợi nhuận"
        value={money(profit)}
        valueCls={profit < 0 ? EXPENSE_TEXT : 'text-foreground'}
        hint={margin !== null ? `Biên ${formatPct(margin)}` : undefined}
      />
      <button
        type="button"
        onClick={onPendingClick}
        aria-pressed={pendingActive}
        title="Xem các khoản chi chưa hoàn tiền"
        className={cn(
          'flex h-[52px] min-w-0 items-center gap-3 rounded-[12px] border border-primary/60 bg-amber-50 px-3 text-left transition-colors hover:bg-amber-100/70 dark:bg-amber-500/10 dark:hover:bg-amber-500/15',
          pendingActive && 'ring-2 ring-primary/40',
        )}
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-card text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-xs text-amber-800 dark:text-amber-300">Chưa hoàn tiền</div>
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[15px] font-bold text-amber-800 tabular dark:text-amber-300">
              {money(kpi.pendingRefund)}
            </span>
            <span className="shrink-0 text-xs text-amber-800/80 dark:text-amber-300/80">
              {kpi.pendingRefundCount} khoản · Xem
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      </button>
    </div>
  );
};

export default FinanceKpis;
