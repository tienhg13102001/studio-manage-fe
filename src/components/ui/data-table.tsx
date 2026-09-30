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
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';

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
          'rounded-[14px] border bg-card overflow-hidden',
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

  if (loading) {
    const content = (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Spinner size="lg" />
      </div>
    );
    return variant === 'card' ? (
      <div className={wrapperCls}>
        {renderTitle()}
        {content}
      </div>
    ) : (
      <>{content}</>
    );
  }

  if (data.length === 0) {
    const content = (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
    );
    return variant === 'card' ? (
      <div className={wrapperCls}>
        {renderTitle()}
        {content}
      </div>
    ) : (
      <>{content}</>
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
                'h-10 font-semibold uppercase tracking-[0.06em] text-[11px] text-muted-foreground/80',
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

  const scrollCls = fill ? 'min-h-0 flex-1 overflow-auto' : 'overflow-x-auto';

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
      <div className={scrollCls}>{table}</div>
      {paginationFooter}
      {footer}
    </div>
  ) : (
    <div className={wrapperCls}>
      <div className={scrollCls}>{table}</div>
      {paginationFooter}
      {footer}
    </div>
  );
}
