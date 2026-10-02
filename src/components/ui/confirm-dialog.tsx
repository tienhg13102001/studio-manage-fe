import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Class bổ sung cho DialogContent (opt-in) */
  contentClassName?: string;
  /** Icon trong vòng tròn 44px phía trên tiêu đề (opt-in; kèm tiêu đề 18px, nội dung 13.5px, căn trái) */
  icon?: ReactNode;
  /** Class màu cho vòng tròn icon, VD `bg-rose-100 text-rose-600` */
  iconClassName?: string;
  /** Icon đặt trước nhãn nút xác nhận (opt-in) */
  confirmIcon?: ReactNode;
  /** Class bổ sung cho nút xác nhận (opt-in) */
  confirmClassName?: string;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xoá',
  cancelLabel = 'Huỷ',
  destructive = true,
  contentClassName,
  icon,
  iconClassName,
  confirmIcon,
  confirmClassName,
  onConfirm,
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn('sm:max-w-sm', contentClassName)}>
      {icon && (
        <span
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5',
            iconClassName,
          )}
        >
          {icon}
        </span>
      )}
      <DialogHeader className={cn(icon && 'text-left')}>
        <DialogTitle className={cn(icon && 'text-[18px]')}>{title}</DialogTitle>
        <DialogDescription className={cn(icon && 'text-[13.5px]')}>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter className={cn('gap-2 sm:gap-0', icon && 'sm:gap-2.5 sm:space-x-0')}>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          className={confirmClassName}
          onClick={() => {
            onConfirm();
          }}
        >
          {confirmIcon}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
