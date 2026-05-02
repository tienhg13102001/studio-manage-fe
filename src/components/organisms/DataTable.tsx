import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Spinner from '../atoms/Spinner';
import EmptyState from '../atoms/EmptyState';
import Pagination from '../atoms/Pagination';

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
  /** Hide the page-size selector. */
  hidePageSize?: boolean;
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
  variant?: 'card' | 'plain';
  dense?: boolean;
  textSize?: 'xs' | 'sm';
  /** Called when a row is clicked. Clicks on buttons/links inside the row are ignored. */
  onRowClick?: (row: T, index: number) => void;
  /**
   * Enable client-side pagination. Pass `true` for defaults or an options object
   * to customize page size and page-size options.
   */
  pagination?: boolean | PaginationOptions;
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyIcon,
  title,
  className = '',
  footer,
  rowClassName,
  rowStyle,
  stickyHeader = false,
  variant = 'card',
  dense = false,
  textSize = 'sm',
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  const paginationOpts = useMemo<PaginationOptions | null>(
    () =>
      pagination ? (typeof pagination === 'object' ? pagination : {}) : null,
    [pagination],
  );

  const initialPageSize = paginationOpts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);

  // Reset to first page whenever the dataset or page size changes
  useEffect(() => {
    setPage(1);
  }, [data, pageSize]);

  const pagedData = useMemo(() => {
    if (!paginationOpts) return data;
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize, paginationOpts]);

  const renderTitle = () =>
    title ? (
      <div
        className="px-6 py-4 border-b"
        style={{ borderColor: 'var(--card-border)', background: 'var(--table-head-bg)' }}
      >
        {typeof title === 'string' ? (
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
        ) : (
          title
        )}
      </div>
    ) : null;

  const wrapperCls =
    variant === 'card' ? `card p-0 overflow-hidden ${className}` : className || undefined;

  if (loading) {
    const content = (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Spinner size="lg" />
      </div>
    );
    return variant === 'card' ? (
      <div className={wrapperCls}>
        {renderTitle()}
        {content}
      </div>
    ) : (
      content
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
      content
    );
  }

  const cellPad = dense ? 'px-3 py-1.5' : 'px-3 py-2 max-w-32';
  const textCls = textSize === 'xs' ? 'text-xs' : 'text-sm';

  const table = (
    <table className={`w-full ${textCls}`}>
      <thead
        className={`border-b ${stickyHeader ? 'sticky top-0 z-10' : ''}`}
        style={{ background: 'var(--table-head-bg)', borderColor: 'var(--card-border)' }}
      >
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={`${cellPad} font-semibold uppercase tracking-wide text-xs ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
              style={{ color: 'var(--text-muted)' }}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pagedData.map((row, i) => {
          const absoluteIndex = paginationOpts ? (page - 1) * pageSize + i : i;
          return (
            <tr
              key={keyExtractor(row, absoluteIndex)}
              className={`${
                rowClassName
                  ? `border-b last:border-0 ${rowClassName(row, absoluteIndex)}`
                  : 'border-b last:border-0'
              }${onRowClick ? ' cursor-pointer' : ''}`}
              style={
                {
                  '--hover-bg': 'var(--table-row-hover)',
                  borderColor: 'var(--card-border)',
                  ...(rowStyle ? rowStyle(row, absoluteIndex) : {}),
                } as React.CSSProperties
              }
              onMouseEnter={
                !rowClassName
                  ? (e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'var(--table-row-hover)';
                    }
                  : undefined
              }
              onMouseLeave={
                !rowClassName
                  ? (e) => {
                      (e.currentTarget as HTMLElement).style.background = '';
                    }
                  : undefined
              }
              onClick={
                onRowClick
                  ? (e) => {
                      if (
                        (e.target as HTMLElement).closest(
                          'button, a, input, label, select, textarea',
                        )
                      ) {
                        return;
                      }
                      onRowClick(row, absoluteIndex);
                    }
                  : undefined
              }
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${cellPad} ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                >
                  {col.render(row, absoluteIndex)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
      {footer && <tfoot>{footer}</tfoot>}
    </table>
  );

  const paginationNode = paginationOpts ? (
    <Pagination
      page={page}
      pageSize={pageSize}
      total={data.length}
      onPageChange={setPage}
      onPageSizeChange={paginationOpts.hidePageSize ? undefined : setPageSize}
      pageSizeOptions={paginationOpts.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS}
    />
  ) : null;

  if (variant === 'plain')
    return paginationNode ? (
      <>
        {table}
        {paginationNode}
      </>
    ) : (
      table
    );

  return (
    <div className={wrapperCls}>
      {renderTitle()}
      {table}
      {paginationNode}
    </div>
  );
}

export default DataTable;
