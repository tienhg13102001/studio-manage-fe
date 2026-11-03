import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCw } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PaginationOptions {
  pageSize?: number;
  pageSizeOptions?: number[];
  hidePageSize?: boolean;
  serverSide?: boolean;
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  title?: ReactNode;
  className?: string;
  footer?: ReactNode;
  rowClassName?: (row: T, index: number) => string;
  rowStyle?: (row: T, index: number) => React.CSSProperties | undefined;
  stickyHeader?: boolean;
  /** Chiếm hết chiều cao còn lại của cha (flex column): chỉ phần thân bảng cuộn, phân trang cố định ở đáy */
  fill?: boolean;
  variant?: 'card' | 'plain';
  dense?: boolean;
  textSize?: 'xs' | 'sm';
  onRowClick?: (row: T, index: number) => void;
  pagination?: boolean | PaginationOptions;
  /** Lỗi tải dữ liệu: hiện thông báo thay vì bảng rỗng (không giả vờ là "không có dữ liệu"). */
  error?: ReactNode;
  onRetry?: () => void;
  /**
   * Hiển thị dạng thẻ trên mobile (<768px) từ cùng một nguồn dữ liệu; bảng chỉ hiện từ md trở lên.
   * Bỏ trống thì mobile vẫn dùng bảng cuộn ngang.
   */
  mobileCard?: (row: T, index: number) => ReactNode;
  emptyAction?: ReactNode;
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyIcon,
  title,
  className,
  footer,
  rowClassName,
  rowStyle,
  stickyHeader = false,
  fill = false,
  variant = 'card',
  dense = false,
  textSize = 'sm',
  onRowClick,
  pagination,
  error,
  onRetry,
  mobileCard,
  emptyAction,
}: DataTableProps<T>) {
  const paginationOpts = useMemo<PaginationOptions | null>(
    () => (pagination ? (typeof pagination === 'object' ? pagination : {}) : null),
    [pagination],
  );

  const initialPageSize = paginationOpts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const isServerPagination = !!paginationOpts?.serverSide;
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const [internalPage, setInternalPage] = useState(1);

  const pageSize = isServerPagination
    ? (paginationOpts?.pageSize ?? DEFAULT_PAGE_SIZE)
    : internalPageSize;
  const page = isServerPagination ? (paginationOpts?.page ?? 1) : internalPage;

  useEffect(() => {
    if (!isServerPagination) setInternalPage(1);
  }, [data, internalPageSize, isServerPagination]);

  const pagedData = useMemo(() => {
    if (!paginationOpts) return data;
    if (isServerPagination) return data;
    const start = (internalPage - 1) * internalPageSize;
    return data.slice(start, start + internalPageSize);
  }, [data, internalPage, internalPageSize, paginationOpts, isServerPagination]);

  const total = paginationOpts?.total ?? data.length;
  const pageSizeOptions = paginationOpts?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;

  const wrapperCls =
    variant === 'card'
      ? cn(
          'rounded-lg border bg-card overflow-hidden',
          fill && 'flex min-h-[320px] flex-col',
          className,
        )
      : cn(fill && 'flex min-h-[320px] flex-col', className);
  const sticky = stickyHeader || fill;

  const renderTitle = () =>
    title ? (
      <div className="px-5 py-4 border-b">
        {typeof title === 'string' ? (
          <h3 className="font-semibold text-foreground">{title}</h3>
        ) : (
          title
        )}
      </div>
    ) : null;

  const wrap = (content: ReactNode) =>
    variant === 'card' ? (
      <div className={wrapperCls}>
        {renderTitle()}
        {content}
      </div>
    ) : (
      <>{content}</>
    );

  if (loading) {
    return wrap(
      <div role="status" aria-busy="true" className="divide-y">
        <span className="sr-only">Đang tải…</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            {columns.slice(0, Math.min(columns.length, 5)).map((c, j) => (
              <Skeleton
                key={c.key}
                className={cn('h-4', j === 0 ? 'flex-[2]' : 'flex-1', j > 1 && 'max-md:hidden')}
              />
            ))}
          </div>
        ))}
      </div>,
    );
  }

  if (error) {
    return wrap(
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
      >
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">Không tải được dữ liệu</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw className="h-4 w-4" />
            Thử lại
          </Button>
        )}
      </div>,
    );
  }

  if (data.length === 0) {
    return wrap(
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />,
    );
  }

  const cellPad = dense ? 'px-4 py-2' : 'px-5 py-3';
  const textCls = textSize === 'xs' ? 'text-xs' : 'text-sm';

  const table = (
    <Table className={textCls} containerClassName={fill ? 'overflow-visible' : undefined}>
      <TableHeader
        className={cn(
          sticky
            ? 'sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_hsl(var(--border))]'
            : 'bg-muted/60',
        )}
      >
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                cellPad,
                'h-10 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground',
                alignClass[col.align ?? 'left'],
                col.className,
              )}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagedData.map((row, i) => {
          const absoluteIndex = paginationOpts ? (page - 1) * pageSize + i : i;
          return (
            <TableRow
              key={keyExtractor(row, absoluteIndex)}
              className={cn(rowClassName?.(row, absoluteIndex), onRowClick && 'cursor-pointer')}
              style={rowStyle?.(row, absoluteIndex)}
              onClick={(e) => {
                if (!onRowClick) return;
                const target = e.target as HTMLElement;
                // Ignore clicks bubbling from portaled content (popovers/dialogs opened in a cell)
                if (!e.currentTarget.contains(target)) return;
                if (target.closest('button,a,input,label,select,textarea')) return;
                onRowClick(row, absoluteIndex);
              }}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(cellPad, alignClass[col.align ?? 'left'], col.className)}
                >
                  {col.render(row, absoluteIndex)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const scrollCls = cn(
    fill ? 'min-h-0 flex-1 overflow-auto' : 'overflow-x-auto',
    mobileCard && 'max-md:hidden',
  );

  const cards = mobileCard ? (
    <ul className={cn('divide-y md:hidden', fill && 'min-h-0 flex-1 overflow-auto')}>
      {pagedData.map((row, i) => {
        const absoluteIndex = paginationOpts ? (page - 1) * pageSize + i : i;
        return (
          <li
            key={keyExtractor(row, absoluteIndex)}
            className={cn('px-4 py-3.5', onRowClick && 'cursor-pointer active:bg-muted/60')}
            onClick={(e) => {
              if (!onRowClick) return;
              const target = e.target as HTMLElement;
              if (!e.currentTarget.contains(target)) return;
              if (target.closest('button,a,input,label,select,textarea,[role=menuitem]')) return;
              onRowClick(row, absoluteIndex);
            }}
          >
            {mobileCard(row, absoluteIndex)}
          </li>
        );
      })}
    </ul>
  ) : null;

  const paginationFooter = paginationOpts ? (
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={(p) => {
        if (isServerPagination) paginationOpts.onPageChange?.(p);
        else setInternalPage(p);
      }}
      onPageSizeChange={
        paginationOpts.hidePageSize
          ? undefined
          : (s) => {
              if (isServerPagination) paginationOpts.onPageSizeChange?.(s);
              else setInternalPageSize(s);
            }
      }
      pageSizeOptions={pageSizeOptions}
    />
  ) : null;

  return variant === 'card' ? (
    <div className={wrapperCls}>
      {renderTitle()}
      {cards}
      <div className={scrollCls}>{table}</div>
      {paginationFooter}
      {footer}
    </div>
  ) : (
    <div className={wrapperCls}>
      {cards}
      <div className={scrollCls}>{table}</div>
      {paginationFooter}
      {footer}
    </div>
  );
}
