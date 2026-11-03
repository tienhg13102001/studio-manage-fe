import { AlertTriangle, ChevronRight, RotateCw } from 'lucide-react';
import { Button, StatCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatPct, marginPct, money, shortMoney, type FinanceKpi } from './financeHelpers';

interface FinanceKpisProps {
  kpi: FinanceKpi;
  /** Mobile: số gọn (1,2 tr ₫), lưới 2×2. */
  compact: boolean;
  pendingActive: boolean;
  onPendingClick: () => void;
  /** Đang tải tổng hợp: khung xương, không hiện số giả. */
  loading?: boolean;
  /** Tổng hợp lỗi: báo lỗi + thử lại thay vì hiện 0 ₫. */
  error?: boolean;
  onRetry?: () => void;
}

/** Tổng thu · Tổng chi · Lợi nhuận · Chưa hoàn tiền (theo mùa / khoảng ngày). */
const FinanceKpis = ({
  kpi,
  compact,
  pendingActive,
  onPendingClick,
  loading,
  error,
  onRetry,
}: FinanceKpisProps) => {
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card px-4 py-3.5 sm:flex-row sm:items-center"
      >
        <AlertTriangle className="hidden h-5 w-5 shrink-0 text-destructive sm:block" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-foreground">Không tải được số liệu tổng hợp</p>
          <p className="text-muted-foreground">
            Tổng thu, chi và lợi nhuận chưa hiển thị. Danh sách giao dịch bên dưới vẫn đúng.
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
            <RotateCw /> Thử lại
          </Button>
        )}
      </div>
    );
  }

  const profit = kpi.income - kpi.expense;
  const margin = marginPct(profit, kpi.income);
  const fmt = compact ? (n: number) => `${shortMoney(n)} ₫` : money;

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
      <StatCard
        label="Tổng thu"
        value={fmt(kpi.income)}
        tone="positive"
        hint={`${kpi.incomeCount} giao dịch`}
        loading={loading}
      />
      <StatCard
        label="Tổng chi"
        value={fmt(kpi.expense)}
        tone="negative"
        hint={`${kpi.expenseCount} giao dịch`}
        loading={loading}
      />
      <StatCard
        label="Lợi nhuận"
        value={fmt(profit)}
        tone={profit < 0 ? 'negative' : 'default'}
        hint={margin !== null ? `Biên lợi nhuận ${formatPct(margin)}` : 'Chưa có thu'}
        loading={loading}
      />
      <button
        type="button"
        onClick={onPendingClick}
        aria-pressed={pendingActive}
        disabled={loading}
        title="Lọc các khoản chi chưa hoàn tiền"
        className={cn(
          'group flex h-full min-w-0 items-center gap-2 rounded-lg border bg-card px-4 py-3.5 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:px-5 md:py-4',
          pendingActive && 'border-foreground ring-1 ring-foreground',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">Chưa hoàn tiền</p>
          {loading ? (
            <span className="mt-2 block h-7 w-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <>
              <p className="tabular mt-1 truncate text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-300">
                {fmt(kpi.pendingRefund)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {kpi.pendingRefundCount} khoản · {pendingActive ? 'Đang lọc' : 'Bấm để lọc'}
              </p>
            </>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
};

export default FinanceKpis;
