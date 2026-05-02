import { useMemo } from 'react';
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';

interface PaginationProps {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Build a compact list of page numbers around the current page.
 * Uses `null` to represent ellipsis gaps.
 */
function buildPageList(current: number, totalPages: number): (number | null)[] {
  const delta = 1; // pages around current
  const range: (number | null)[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(totalPages - 1, current + delta);

  range.push(1);
  if (left > 2) range.push(null);
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push(null);
  if (totalPages > 1) range.push(totalPages);

  return range;
}

const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, total);

  const pages = useMemo(() => buildPageList(safePage, totalPages), [safePage, totalPages]);

  const goTo = (p: number) => {
    if (p < 1 || p > totalPages || p === safePage) return;
    onPageChange(p);
  };

  const btnBase =
    'inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-2 ${className}`}
      style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
    >
      <div className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
        {total === 0 ? (
          'Không có dữ liệu'
        ) : (
          <>
            Hiển thị <span className="font-medium">{startItem}</span>–
            <span className="font-medium">{endItem}</span> trên{' '}
            <span className="font-medium">{total}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {onPageSizeChange && (
          <label
            className="flex items-center gap-1 text-xs sm:text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="hidden sm:inline">Mỗi trang</span>
            <select
              className="h-8 px-2 rounded-md text-sm border"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
              }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={btnBase}
            style={{ color: 'var(--text-primary)' }}
            onClick={() => goTo(1)}
            disabled={safePage === 1}
            aria-label="Trang đầu"
          >
            <FaAngleDoubleLeft />
          </button>
          <button
            type="button"
            className={btnBase}
            style={{ color: 'var(--text-primary)' }}
            onClick={() => goTo(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Trang trước"
          >
            <FaAngleLeft />
          </button>

          {pages.map((p, idx) =>
            p === null ? (
              <span
                key={`gap-${idx}`}
                className="px-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                className={`${btnBase} ${
                  p === safePage ? 'font-semibold' : ''
                }`}
                style={
                  p === safePage
                    ? {
                        background: 'var(--primary, #3b82f6)',
                        color: '#fff',
                      }
                    : { color: 'var(--text-primary)' }
                }
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            className={btnBase}
            style={{ color: 'var(--text-primary)' }}
            onClick={() => goTo(safePage + 1)}
            disabled={safePage === totalPages}
            aria-label="Trang sau"
          >
            <FaAngleRight />
          </button>
          <button
            type="button"
            className={btnBase}
            style={{ color: 'var(--text-primary)' }}
            onClick={() => goTo(totalPages)}
            disabled={safePage === totalPages}
            aria-label="Trang cuối"
          >
            <FaAngleDoubleRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
