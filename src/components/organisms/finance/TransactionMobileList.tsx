import { ChevronsDown } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Season, TransactionResponse } from '../../../types';
import RefundStatus from './RefundStatus';
import { EXPENSE_TEXT, INCOME_TEXT, plainAmount, shortDate } from './financeHelpers';

interface TransactionMobileListProps {
  rows: TransactionResponse[];
  total: number;
  season: Season | null;
  canRefund: boolean;
  onToggleRefund: (tx: TransactionResponse, value: boolean) => void;
  onOpen: (tx: TransactionResponse) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/** Mobile transaction rows (~54px): color bar, description + signed amount, meta + refund. */
const TransactionMobileList = ({
  rows,
  total,
  season,
  canRefund,
  onToggleRefund,
  onOpen,
  hasMore,
  loadingMore,
  onLoadMore,
}: TransactionMobileListProps) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
        Chưa có dữ liệu
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
        {rows.map((t) => {
          const income = t.type === 'income';
          const meta = [shortDate(t.date, season), t.categoryId?.name, t.customer?.className]
            .filter(Boolean)
            .join(' · ');
          return (
            <div
              key={t._id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(t)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && e.key === 'Enter') onOpen(t);
              }}
              className="flex min-h-[54px] cursor-pointer items-stretch gap-3 px-3 py-2 active:bg-muted/50"
            >
              <span
                className={cn(
                  'w-[3px] shrink-0 rounded-full',
                  income ? 'bg-emerald-500' : 'bg-rose-500',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                    {t.description || t.categoryId?.name || '—'}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-[14px] font-semibold tabular',
                      income ? INCOME_TEXT : EXPENSE_TEXT,
                    )}
                  >
                    {income ? '+' : '−'}
                    {plainAmount(t.amount)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground tabular">
                    {meta}
                  </span>
                  {!income && (
                    <RefundStatus
                      tx={t}
                      canToggle={canRefund}
                      onToggle={onToggleRefund}
                      variant="text"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[12.5px] text-muted-foreground tabular">
        Hiển thị 1–{rows.length} trên {total}
      </p>
      {hasMore && (
        <Button
          variant="outline"
          className="w-full shadow-none"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? <Spinner size="sm" /> : <ChevronsDown />}
          Tải thêm 20
        </Button>
      )}
    </div>
  );
};

export default TransactionMobileList;
