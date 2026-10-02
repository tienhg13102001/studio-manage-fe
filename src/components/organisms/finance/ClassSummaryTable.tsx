import { Clock } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getSchoolName, type TransactionSummaryRow } from '../../../types';
import {
  EXPENSE_TEXT,
  INCOME_TEXT,
  formatPct,
  kpiFromSummary,
  marginPct,
  money,
  plainAmount,
  shortMoney,
} from './financeHelpers';

interface ClassSummaryTableProps {
  rows: TransactionSummaryRow[];
  loading: boolean;
  /** Mobile: stacked cards instead of a table. */
  compact: boolean;
}

const NO_CLASS = '(Không có lớp)';

const MarginPill = ({ profit, income }: { profit: number; income: number }) => {
  const pct = marginPct(profit, income);
  if (pct === null) return null;
  return (
    <span
      className={cn(
        'rounded-[5px] px-1.5 py-px text-[11px] font-semibold tabular',
        pct >= 60
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {formatPct(Math.round(pct))}
    </span>
  );
};

const PendingPill = ({ amount }: { amount: number }) =>
  amount > 0 ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800 tabular dark:text-amber-300">
      <Clock className="h-3 w-3" />
      {plainAmount(amount)}
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );

const th =
  'sticky top-0 z-10 h-8 bg-muted/95 px-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur first:pl-4 last:pr-4';
const td = 'h-[38px] px-2.5 first:pl-4 last:pr-4';

/** "Tổng hợp theo lớp": one row per class (sorted by transaction count) + pinned totals. */
const ClassSummaryTable = ({ rows, loading, compact }: ClassSummaryTableProps) => {
  const sorted = [...rows].sort(
    (a, b) =>
      (b.count ?? 0) - (a.count ?? 0) ||
      (a.customer?.className ?? '').localeCompare(b.customer?.className ?? ''),
  );
  const sum = kpiFromSummary(rows);
  const profit = sum.income - sum.expense;
  const totalCount = rows.reduce((n, r) => n + (r.count ?? 0), 0);
  const classCount = rows.filter((r) => r.customer).length;

  if (compact) {
    return (
      <div className="space-y-2">
        {sorted.map((r) => (
          <div key={r._id ?? 'none'} className="rounded-[12px] border bg-card px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {r.customer?.className ?? NO_CLASS}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {getSchoolName(r.customer)}
              </span>
              <span className="text-xs text-muted-foreground tabular">{r.count ?? 0} GD</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[13px] tabular">
              <span className={INCOME_TEXT}>+{shortMoney(r.income)}</span>
              <span className={EXPENSE_TEXT}>−{shortMoney(r.expense)}</span>
              <span className="font-semibold text-foreground">= {shortMoney(r.profit)}</span>
              <MarginPill profit={r.profit} income={r.income} />
              <span className="ml-auto">
                {r.pendingRefund > 0 && <PendingPill amount={r.pendingRefund} />}
              </span>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
            {loading ? <Spinner /> : 'Chưa có dữ liệu'}
          </div>
        ) : (
          <div className="rounded-[12px] border bg-muted/40 px-3.5 py-2.5 text-[13px] tabular">
            <div className="font-semibold">
              Tổng {classCount} lớp · {totalCount} GD
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3">
              <span className={INCOME_TEXT}>+{shortMoney(sum.income)}</span>
              <span className={EXPENSE_TEXT}>−{shortMoney(sum.expense)}</span>
              <span className="font-semibold">= {shortMoney(profit)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border bg-card">
      <div className="relative min-h-[240px] flex-1 overflow-auto">
        <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-0 text-[13px]">
          <colgroup>
            <col className="w-[96px]" />
            <col />
            <col className="w-[80px]" />
            <col className="w-[150px]" />
            <col className="w-[150px]" />
            <col className="w-[190px]" />
            <col className="w-[130px]" />
          </colgroup>
          <thead>
            <tr>
              <th className={th}>Lớp</th>
              <th className={th}>Trường</th>
              <th className={cn(th, 'text-right')} aria-sort="descending">
                Số GD ↓
              </th>
              <th className={cn(th, 'text-right')}>Tổng thu</th>
              <th className={cn(th, 'text-right')}>Tổng chi</th>
              <th className={cn(th, 'text-right')}>Lợi nhuận</th>
              <th className={cn(th, 'text-right')}>Chưa hoàn</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r._id ?? 'none'} className="[&>td]:border-b hover:bg-muted/50">
                <td
                  className={cn(
                    td,
                    'truncate font-semibold',
                    r.customer ? 'text-foreground' : 'italic text-muted-foreground',
                  )}
                >
                  {r.customer?.className ?? NO_CLASS}
                </td>
                <td className={cn(td, 'truncate text-foreground/80')}>
                  {getSchoolName(r.customer)}
                </td>
                <td className={cn(td, 'text-right tabular')}>{r.count ?? 0}</td>
                <td className={cn(td, 'whitespace-nowrap text-right tabular', INCOME_TEXT)}>
                  +{money(r.income)}
                </td>
                <td className={cn(td, 'whitespace-nowrap text-right tabular', EXPENSE_TEXT)}>
                  −{money(r.expense)}
                </td>
                <td className={cn(td, 'whitespace-nowrap text-right')}>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-bold tabular',
                        r.profit < 0 ? EXPENSE_TEXT : 'text-foreground',
                      )}
                    >
                      {money(r.profit)}
                    </span>
                    <MarginPill profit={r.profit} income={r.income} />
                  </span>
                </td>
                <td className={cn(td, 'text-right')}>
                  <PendingPill amount={r.pendingRefund ?? 0} />
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            // Sticky totals row inside the table so its columns always line up with the body
            <tfoot>
              <tr className="font-semibold tabular [&>td]:sticky [&>td]:bottom-0 [&>td]:h-11 [&>td]:border-t [&>td]:bg-muted">
                <td className={td} colSpan={2}>
                  <span className="whitespace-nowrap">Tổng {classCount} lớp</span>
                </td>
                <td className={cn(td, 'text-right')}>{totalCount}</td>
                <td className={cn(td, 'whitespace-nowrap text-right', INCOME_TEXT)}>
                  +{money(sum.income)}
                </td>
                <td className={cn(td, 'whitespace-nowrap text-right', EXPENSE_TEXT)}>
                  −{money(sum.expense)}
                </td>
                <td className={cn(td, 'whitespace-nowrap text-right')}>
                  {money(profit)}
                  {marginPct(profit, sum.income) !== null &&
                    ` · ${formatPct(marginPct(profit, sum.income)!)}`}
                </td>
                <td
                  className={cn(
                    td,
                    'whitespace-nowrap text-right text-amber-700 dark:text-amber-300',
                  )}
                >
                  {sum.pendingRefund > 0 ? plainAmount(sum.pendingRefund) : '—'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {rows.length === 0 && !loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassSummaryTable;
