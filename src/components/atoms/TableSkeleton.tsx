interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

/**
 * Animated skeleton placeholder for table loading states.
 * `cols` controls how many skeleton cells per row (default 5).
 */
const TableSkeleton = ({ rows = 6, cols = 5 }: TableSkeletonProps) => (
  <div className="card p-0 overflow-hidden">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0"
      >
        {Array.from({ length: cols }).map((_, j) => (
          <div
            key={j}
            className="h-4 rounded-md bg-gray-200 animate-pulse"
            style={{ flex: j === 0 ? 2 : 1 }}
          />
        ))}
      </div>
    ))}
  </div>
);

export default TableSkeleton;
