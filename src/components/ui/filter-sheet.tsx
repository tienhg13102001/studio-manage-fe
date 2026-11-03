import type { ReactNode } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/** Lớp nội dung cho bottom sheet trên mobile (dùng chung mọi trang). */
export const SHEET_CLS =
  'inset-x-0 bottom-0 left-0 top-auto max-h-[calc(100dvh-2rem)] max-w-none translate-x-0 translate-y-0 gap-4 overflow-y-auto rounded-none rounded-t-2xl border-0 bg-card px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_40px_rgba(28,26,23,0.18)] duration-300 data-[state=closed]:!slide-out-to-left-0 data-[state=closed]:!slide-out-to-bottom-full data-[state=closed]:!zoom-out-100 data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-bottom-full data-[state=open]:!zoom-in-100 sm:rounded-none sm:rounded-t-2xl [&>button:last-child]:hidden';

/** Chiều cao điều khiển trong sheet: đủ lớn cho ngón tay. */
export const SHEET_CONTROL_CLS = 'h-11 rounded-md bg-card shadow-none';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onReset: () => void;
  canReset: boolean;
  /** Số kết quả hiện tại; nút xác nhận hiện "Xem N {unit}". */
  total: number;
  unit: string;
  loading?: boolean;
  children: ReactNode;
}

/** Bộ lọc dạng sheet trượt từ dưới lên (mobile): tiêu đề, các nhóm lọc, Xoá lọc + Xem kết quả. */
export const FilterSheet = ({
  open,
  onOpenChange,
  title = 'Bộ lọc',
  onReset,
  canReset,
  total,
  unit,
  loading,
  children,
}: FilterSheetProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby={undefined} className={SHEET_CLS}>
      <div className="flex justify-center" aria-hidden>
        <span className="h-1 w-10 rounded-full bg-border" />
      </div>
      <div className="flex items-center border-b border-foreground/80 pb-2">
        <DialogTitle className="flex-1 font-display text-xl font-bold">{title}</DialogTitle>
        <DialogClose
          aria-label="Đóng"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" />
        </DialogClose>
      </div>

      {children}

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2.5 border-t bg-card px-4 pt-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={!canReset}
          onClick={onReset}
        >
          <RotateCcw />
          Xoá bộ lọc
        </Button>
        <Button type="button" className="h-11" onClick={() => onOpenChange(false)}>
          {loading ? <Spinner size="sm" /> : <Check />}
          {loading ? 'Xem kết quả' : `Xem ${total} ${unit}`}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

/** Một nhóm lọc: nhãn + điều khiển. */
export const FilterSection = ({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('space-y-2', className)}>
    <span className="block text-[13px] font-semibold text-muted-foreground">{label}</span>
    {children}
  </div>
);

/** Chip chọn một giá trị (Tất cả / Thu / Chi...). */
export const FilterChip = ({
  active,
  dot,
  onClick,
  children,
}: {
  active: boolean;
  dot?: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active
        ? 'border-foreground bg-foreground text-background'
        : 'border-border bg-card text-foreground hover:bg-muted',
    )}
  >
    {dot && <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />}
    {children}
  </button>
);
