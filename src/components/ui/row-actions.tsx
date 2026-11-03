import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  /** Hành động phá huỷ (xoá, huỷ): luôn nằm trong menu "…", tách bởi vạch, chữ đỏ. */
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

interface RowActionsProps {
  /** Tên dòng cho trình đọc màn hình, vd. "lớp 12A7". */
  subject: string;
  /** Hành động hay dùng nhất, hiện thẳng thành nút icon (không được là hành động phá huỷ). */
  primary?: RowAction;
  actions: RowAction[];
  className?: string;
}

/** Mở dialog từ menu: đợi menu đóng xong để Radix không giành focus về nút "…". */
const later = (fn: () => void) => () => window.setTimeout(fn, 0);

const iconBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

/** Cụm hành động cuối dòng: một nút chính + menu "…" chứa phần còn lại. */
export const RowActions = ({ subject, primary, actions, className }: RowActionsProps) => {
  const visible = actions.filter((a) => !a.hidden);
  const normal = visible.filter((a) => !a.destructive);
  const danger = visible.filter((a) => a.destructive);
  return (
    <div className={cn('flex items-center justify-end gap-0.5', className)}>
      {primary && !primary.hidden && (
        <button
          type="button"
          className={iconBtn}
          onClick={primary.onSelect}
          disabled={primary.disabled}
          aria-label={`${primary.label} ${subject}`}
          title={primary.label}
        >
          {primary.icon}
        </button>
      )}
      {visible.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className={iconBtn} aria-label={`Thao tác khác cho ${subject}`}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[180px]"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {normal.map((a) => (
              <DropdownMenuItem
                key={a.label}
                disabled={a.disabled}
                onSelect={later(a.onSelect)}
                className="gap-2"
              >
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            ))}
            {normal.length > 0 && danger.length > 0 && <DropdownMenuSeparator />}
            {danger.map((a) => (
              <DropdownMenuItem
                key={a.label}
                disabled={a.disabled}
                onSelect={later(a.onSelect)}
                className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
