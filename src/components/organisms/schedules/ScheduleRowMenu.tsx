import {
  CalendarX,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface ScheduleRowMenuProps {
  cancelled: boolean;
  onEdit: () => void;
  /** Omitted when the crew can't be edited. */
  onEditCrew?: () => void;
  onToggleCancel: () => void;
  onDelete: () => void;
  /** Vertical dots (mobile cards) instead of horizontal. */
  vertical?: boolean;
  className?: string;
}

const itemCls =
  'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] [&_svg]:h-4 [&_svg]:w-4';

/** "⋯" menu of a schedule row: edit, crew, cancel/restore, delete. */
const ScheduleRowMenu = ({
  cancelled,
  onEdit,
  onEditCrew,
  onToggleCancel,
  onDelete,
  vertical,
  className,
}: ScheduleRowMenuProps) => {
  // Let the menu finish closing (and restoring focus) before opening a dialog/popover
  const later = (fn: () => void) => () => setTimeout(fn, 0);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Thao tác khác"
          className={cn(
            'inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted',
            className,
          )}
        >
          {vertical ? <MoreVertical className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-[12px] p-1.5"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem className={itemCls} onSelect={later(onEdit)}>
          <Pencil className="text-muted-foreground" /> Sửa lịch
        </DropdownMenuItem>
        {onEditCrew && !cancelled && (
          <DropdownMenuItem className={itemCls} onSelect={later(onEditCrew)}>
            <Users className="text-muted-foreground" /> Sửa ekip
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className={cn(itemCls, 'items-start', !cancelled && 'text-amber-700 dark:text-amber-300')}
          onSelect={later(onToggleCancel)}
        >
          {cancelled ? (
            <>
              <RotateCcw className="text-muted-foreground" /> Khôi phục lịch
            </>
          ) : (
            <>
              <CalendarX className="mt-0.5" />
              <span>
                Huỷ lịch
                <span className="block text-xs font-normal text-muted-foreground">
                  Giữ lại lịch sử, có thể khôi phục
                </span>
              </span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(itemCls, 'text-rose-600 focus:text-rose-600 dark:text-rose-400')}
          onSelect={later(onDelete)}
        >
          <Trash2 /> Xoá lịch
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ScheduleRowMenu;
