import type { ReactNode } from 'react';
import Spinner from '../atoms/Spinner';
import EmptyState from '../atoms/EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  title?: ReactNode;
  className?: string;
  footer?: ReactNode;
  rowClassName?: (row: T, index: number) => string;
  stickyHeader?: boolean;
  variant?: 'card' | 'plain';
  dense?: boolean;
  textSize?: 'xs' | 'sm';
  /** Called when a row is clicked. Clicks on buttons/links inside the row are ignored. */
  onRowClick?: (row: T, index: number) => void;
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

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
  stickyHeader = false,
  variant = 'card',
  dense = false,
  textSize = 'sm',
  onRowClick,
}: DataTableProps<T>) {
  const renderTitle = () =>
    title ? (
      <div className="px-6 py-4 border-b bg-gray-50">
        {typeof title === 'string' ? (
          <h3 className="font-semibold text-gray-800">{title}</h3>
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
        className={`bg-gray-50 text-gray-600 border-b ${stickyHeader ? 'sticky top-0 z-10' : ''}`}
      >
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={`${cellPad} font-medium ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={keyExtractor(row, i)}
            className={`${
              rowClassName
                ? `border-b last:border-0 ${rowClassName(row, i)}`
                : 'border-b last:border-0 hover:bg-gray-50'
            }${onRowClick ? ' cursor-pointer' : ''}`}
            onClick={
              onRowClick
                ? (e) => {
                    if ((e.target as HTMLElement).closest('button, a, input, label, select, textarea')) {
                      return;
                    }
                    onRowClick(row, i);
                  }
                : undefined
            }
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`${cellPad} ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
              >
                {col.render(row, i)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer && <tfoot>{footer}</tfoot>}
    </table>
  );

  if (variant === 'plain') return table;

  return (
    <div className={wrapperCls}>
      {renderTitle()}
      {table}
    </div>
  );
}

export default DataTable;
