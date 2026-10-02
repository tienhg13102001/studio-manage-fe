import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransactionResponse } from '../../../types';

interface RefundStatusProps {
  tx: TransactionResponse;
  /** Accountant may toggle the flag (same permission as the old checkbox). */
  canToggle: boolean;
  onToggle: (tx: TransactionResponse, value: boolean) => void;
  /** `pill` in the table, plain text on mobile rows. */
  variant?: 'pill' | 'text';
}

/** "✓ Đã hoàn" / "◷ Chưa hoàn" for expenses, "—" for income. */
const RefundStatus = ({ tx, canToggle, onToggle, variant = 'pill' }: RefundStatusProps) => {
  if (tx.type !== 'expense') return <span className="text-muted-foreground">—</span>;
  const done = !!tx.accountantRefunded;
  const content = (
    <>
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {done ? 'Đã hoàn' : 'Chưa hoàn'}
    </>
  );
  const cls = cn(
    'inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold',
    variant === 'pill' && 'rounded-full px-2 py-0.5',
    done
      ? cn('text-emerald-700 dark:text-emerald-300', variant === 'pill' && 'bg-emerald-500/15')
      : cn('text-amber-700 dark:text-amber-300', variant === 'pill' && 'bg-amber-500/15'),
  );
  if (!canToggle) return <span className={cls}>{content}</span>;
  return (
    <button
      type="button"
      title={done ? 'Đánh dấu chưa hoàn tiền' : 'Đánh dấu kế toán đã hoàn tiền'}
      aria-pressed={done}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(tx, !done);
      }}
      className={cn(cls, 'transition hover:brightness-95')}
    >
      {content}
    </button>
  );
};

export default RefundStatus;
