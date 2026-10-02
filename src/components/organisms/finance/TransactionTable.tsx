import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Pagination, Spinner, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Season, TransactionResponse, TransactionTotals } from '../../../types';
import { CrewAvatar } from '../schedules/CrewAvatar';
import RefundStatus from './RefundStatus';
import {
  EXPENSE_TEXT,
  INCOME_TEXT,
  givenName,
  money,
  shortDate,
  type TxSort,
} from './financeHelpers';

interface TransactionTableProps {
  rows: TransactionResponse[];
  loading: boolean;
  season: Season | null;
  sort: TxSort;
  onSortToggle: () => void;
  canRefund: boolean;
  onToggleRefund: (tx: TransactionResponse, value: boolean) => void;
  onEdit: (tx: TransactionResponse) => void;
  onDelete: (tx: TransactionResponse) => void;
  totals: TransactionTotals | null;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const th =
  'sticky top-0 z-10 h-8 bg-muted/95 px-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur first:pl-4 last:pr-4';
const td = 'h-[38px] px-2.5 first:pl-4 last:pr-4';

/** Dense transaction list: sticky header, body scrolls inside, pinned totals + pager footer. */
const TransactionTable = ({
  rows,
  loading,
  season,
  sort,
  onSortToggle,
  canRefund,
  onToggleRefund,
  onEdit,
  onDelete,
  totals,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: TransactionTableProps) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border bg-card">
    <div className="relative min-h-[240px] flex-1 overflow-auto">
      <table className="w-full min-w-[660px] table-fixed border-separate border-spacing-0 text-[13px]">
        <colgroup>
          <col className="w-[64px]" />
          <col className="w-[150px]" />
          <col className="w-[72px]" />
          <col />
          {/* Người thực hiện: hidden on narrow desktops (< xl) to keep the table from overflowing */}
          <col className="hidden w-[136px] xl:table-column" />
          <col className="w-[128px]" />
          <col className="w-[110px]" />
          <col className="w-[72px]" />
        </colgroup>
        <thead>
          <tr>
            <th className={th} aria-sort={sort === 'date_asc' ? 'ascending' : 'descending'}>
              <button
                type="button"
                onClick={onSortToggle}
                className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                title="Sắp xếp theo ngày"
              >
                Ngày
                {sort === 'date_asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
              </button>
            </th>
            <th className={th}>Danh mục</th>
            <th className={th}>Lớp</th>
            <th className={th}>Mô tả</th>
            <th className={cn(th, 'hidden xl:table-cell')}>Người thực hiện</th>
            <th className={cn(th, 'text-right')}>Số tiền</th>
            <th className={th}>KT hoàn</th>
            <th className={th}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const income = t.type === 'income';
            const person = givenName(t.createdBy);
            return (
              <tr key={t._id} className="group [&>td]:border-b hover:bg-muted/50">
                <td className={cn(td, 'text-muted-foreground tabular')}>
                  {shortDate(t.date, season)}
                </td>
                <td className={td}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'h-[7px] w-[7px] shrink-0 rounded-full',
                        income ? 'bg-emerald-500' : 'bg-rose-500',
                      )}
                      aria-label={income ? 'Thu' : 'Chi'}
                    />
                    <span className="truncate font-medium text-foreground">
                      {t.categoryId?.name ?? '—'}
                    </span>
                  </span>
                </td>
                <td className={cn(td, 'truncate font-semibold text-foreground')}>
                  {t.customer?.className ?? (
                    <span className="font-normal text-muted-foreground">—</span>
                  )}
                </td>
                <td className={td}>
                  {t.description ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate text-foreground/80">{t.description}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[320px] whitespace-pre-line">
                        {t.description}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={cn(td, 'hidden xl:table-cell')}>
                  {person ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <CrewAvatar name={person} size={20} className="ring-0" />
                      <span className="truncate text-foreground/80">{person}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className={cn(
                    td,
                    'whitespace-nowrap text-right font-semibold tabular',
                    income ? INCOME_TEXT : EXPENSE_TEXT,
                  )}
                >
                  {income ? '+' : '−'}
                  {money(t.amount)}
                </td>
                <td className={td}>
                  <RefundStatus tx={t} canToggle={canRefund} onToggle={onToggleRefund} />
                </td>
                <td className={cn(td, 'text-right')}>
                  <span className="inline-flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      title="Sửa"
                      aria-label="Sửa giao dịch"
                      onClick={() => onEdit(t)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Xoá"
                      aria-label="Xoá giao dịch"
                      onClick={() => onDelete(t)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
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
    <div className="flex h-11 shrink-0 items-center gap-4 border-t bg-muted/40 px-4 text-[13px]">
      <span className="whitespace-nowrap text-muted-foreground">
        Theo bộ lọc:{' '}
        <span className={cn('font-semibold tabular', INCOME_TEXT)}>
          Thu +{money(totals?.income ?? 0)}
        </span>
        <span className="mx-1.5">·</span>
        <span className={cn('font-semibold tabular', EXPENSE_TEXT)}>
          Chi −{money(totals?.expense ?? 0)}
        </span>
      </span>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[20, 50, 100]}
        className="ml-auto flex-1 border-t-0 px-0 py-0 sm:justify-end sm:gap-4"
      />
    </div>
  </div>
);

export default TransactionTable;
