interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const cellStyle = {
  background:
    'linear-gradient(90deg, rgba(148,163,184,0.12) 0%, rgba(148,163,184,0.22) 50%, rgba(148,163,184,0.12) 100%)',
};

/**
 * Animated skeleton placeholder for table loading states.
 * `cols` controls how many skeleton cells per row (default 5).
 */
const TableSkeleton = ({ rows = 6, cols = 5 }: TableSkeletonProps) => (
  <div className="card p-0 overflow-hidden">
    <div
      className="px-4 py-3 border-b"
      style={{ background: 'var(--table-head-bg)', borderColor: 'var(--card-border)' }}
    >
      <div
        className="h-3.5 w-40 rounded-full animate-pulse"
        style={{
          background:
            'linear-gradient(90deg, rgba(148,163,184,0.10) 0%, rgba(148,163,184,0.18) 50%, rgba(148,163,184,0.10) 100%)',
        }}
      />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0"
        style={{ borderColor: 'var(--card-border)' }}
      >
        {Array.from({ length: cols }).map((_, j) => (
          <div
            key={j}
            className="h-4 rounded-md animate-pulse"
            style={{ ...cellStyle, flex: j === 0 ? 2 : 1 }}
          />
        ))}
      </div>
    ))}
  </div>
);

export default TableSkeleton;
