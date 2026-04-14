import type { ReactNode } from 'react';
import Spinner from '../atoms/Spinner';
import EmptyState from '../atoms/EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Extra Tailwind classes on the <th> and matching <td> */
  className?: string;
  /** Align the column. Defaults to left */
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

/**
 * Organism: generic responsive data table.
 * Handles loading state, empty state, and column rendering automatically.
 *
 * Usage:
 *   const columns: Column<Customer>[] = [
 *     { key: 'name', header: 'Tên lớp', render: (c) => c.className },
 *     { key: 'actions', header: '', align: 'right', render: (c) => <ActionButtons ... /> },
 *   ];
 *   <DataTable columns={columns} data={customers} keyExtractor={(c) => c._id} loading={loading} />
 */
function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyIcon,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 border-b">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-medium ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="border-b last:border-0 hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
