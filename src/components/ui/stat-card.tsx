import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'positive' | 'negative' | 'muted';

const toneCls: Record<Tone, string> = {
  default: 'text-foreground',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-700 dark:text-red-400',
  muted: 'text-muted-foreground',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Dòng phụ dưới số: so sánh, đơn vị, kỳ. */
  hint?: ReactNode;
  tone?: Tone;
  /** Đang tải: hiện khung xương, không hiện số giả (vd. 0 ₫). */
  loading?: boolean;
  /** Lỗi tải: hiện "Không tải được" thay vì một con số sai. */
  error?: boolean;
  to?: string;
  className?: string;
}

/** Ô số liệu: nhãn nhỏ, số lớn chữ số đều, gạch mảnh phía trên như chú thích kỷ yếu. */
export const StatCard = ({
  label,
  value,
  hint,
  tone = 'default',
  loading,
  error,
  to,
  className,
}: StatCardProps) => {
  const inner = (
    <div
      className={cn(
        'h-full rounded-lg border bg-card px-4 py-3.5 md:px-5 md:py-4',
        to && 'transition-colors hover:border-foreground/30',
        className,
      )}
    >
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <div role="status" className="mt-2">
          <Skeleton className="h-7 w-28" />
          <span className="sr-only">Đang tải…</span>
        </div>
      ) : error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Không tải được
        </p>
      ) : (
        <p className={cn('tabular mt-1 text-2xl font-bold tracking-tight', toneCls[tone])}>
          {value}
        </p>
      )}
      {hint && !loading && !error && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return to ? (
    <Link
      to={to}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
};
