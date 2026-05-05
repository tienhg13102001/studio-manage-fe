import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton = ({ rows = 6, cols = 5 }: TableSkeletonProps) => (
  <div className="rounded-lg border bg-card overflow-hidden">
    <div className="px-4 py-3 border-b bg-muted/40">
      <Skeleton className="h-3.5 w-40" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-4 rounded-md" style={{ flex: j === 0 ? 2 : 1 }} />
        ))}
      </div>
    ))}
  </div>
);
