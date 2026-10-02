import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  /** Dưới breakpoint `sm` hiển thị dạng bottom sheet (opt-in) */
  mobileSheet?: boolean;
  /** Tiêu đề riêng cho bottom sheet (mặc định dùng `title`) */
  mobileTitle?: ReactNode;
  /** Mô tả riêng cho bottom sheet (mặc định dùng `description`; `null` để ẩn) */
  mobileDescription?: ReactNode;
  /** Icon trong tile 36px (amber) ở header desktop — bật layout header/body/footer theo design (opt-in) */
  icon?: ReactNode;
  /** Nội dung footer: desktop = dải nền muted + viền trên; mobile sheet = hàng nút full-width chia đều */
  footer?: ReactNode;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
  xl: 'sm:max-w-5xl',
};

/** Bottom sheet < sm: ghim đáy, full width, bo góc trên 24px, trượt lên từ dưới */
const sheetClass =
  'max-sm:inset-x-0 max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:gap-3.5 max-sm:rounded-t-3xl max-sm:border-0 max-sm:px-4 max-sm:pb-[30px] max-sm:pt-2.5 max-sm:data-[state=closed]:slide-out-to-left-0 max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=closed]:slide-out-to-bottom-full max-sm:data-[state=open]:slide-in-from-bottom-full max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:zoom-in-100 max-sm:[&>button:last-child]:hidden';

/**
 * Convenience wrapper around shadcn Dialog with title + sized content,
 * matching the project's previous Modal API ergonomics.
 */
export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  className,
  contentClassName,
  headerClassName,
  mobileSheet = false,
  mobileTitle,
  mobileDescription,
  icon,
  footer,
  onEscapeKeyDown,
}: ModalProps) => {
  const sheetTitle = mobileTitle ?? title;
  const sheetDescription = mobileDescription !== undefined ? mobileDescription : description;

  if (icon || footer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onEscapeKeyDown={onEscapeKeyDown}
          className={cn(
            sizeClass[size],
            'flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl [&>button:last-child]:hidden',
            mobileSheet && sheetClass,
            mobileSheet && 'max-sm:overflow-y-auto',
            contentClassName,
          )}
        >
          {mobileSheet && (
            <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-sm bg-border sm:hidden" />
          )}
          <div
            className={cn(
              'flex min-w-0 shrink-0 items-center gap-3 border-b px-[22px] py-[18px]',
              mobileSheet && 'max-sm:gap-2.5 max-sm:border-0 max-sm:p-0',
            )}
          >
            {icon && (
              <span
                className={cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 [&_svg]:h-[18px] [&_svg]:w-[18px]',
                  mobileSheet && 'max-sm:hidden',
                )}
              >
                {icon}
              </span>
            )}
            <DialogHeader
              className={cn(
                'min-w-0 flex-1 space-y-0.5 text-left',
                mobileSheet && 'max-sm:space-y-[3px]',
                headerClassName,
              )}
            >
              <DialogTitle className="text-[17px] leading-[22px] tracking-normal">
                {mobileSheet ? (
                  <>
                    <span className="sm:hidden">{sheetTitle}</span>
                    <span className="hidden sm:inline">{title}</span>
                  </>
                ) : (
                  title
                )}
              </DialogTitle>
              {mobileSheet && sheetDescription && (
                <p className="text-xs leading-[15px] text-[var(--text-faint)] sm:hidden">
                  {sheetDescription}
                </p>
              )}
              {description && (
                <p
                  className={cn(
                    'text-xs leading-[15px] text-[var(--text-faint)]',
                    mobileSheet && 'hidden sm:block',
                  )}
                >
                  {description}
                </p>
              )}
            </DialogHeader>
            {mobileSheet && (
              <DialogClose className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            )}
            {/* Chừa chỗ cho nút đóng desktop (đặt cuối DOM để focus đầu tiên rơi vào field) */}
            <span aria-hidden className={cn('w-[18px] shrink-0', mobileSheet && 'max-sm:hidden')} />
          </div>
          <div
            className={cn(
              'min-h-0 min-w-0 flex-1 overflow-y-auto px-[22px] py-[18px]',
              mobileSheet && 'max-sm:overflow-visible max-sm:p-0',
              className,
            )}
          >
            {children}
          </div>
          {footer && (
            <div
              className={cn(
                'flex shrink-0 items-center justify-end gap-2.5 border-t bg-muted/40 px-[22px] py-3.5',
                mobileSheet &&
                  'max-sm:grid max-sm:auto-cols-fr max-sm:grid-flow-col max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:[&>*]:h-11 max-sm:[&>*]:w-full',
              )}
            >
              {footer}
            </div>
          )}
          <DialogClose
            className={cn(
              'absolute right-[15px] inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-faint)] transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              description ? 'top-[22px]' : icon ? 'top-5' : 'top-[13px]',
              mobileSheet && 'max-sm:hidden',
            )}
          >
            <X className="h-[18px] w-[18px]" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
  }

  if (!mobileSheet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onEscapeKeyDown={onEscapeKeyDown}
          className={cn(
            sizeClass[size],
            'max-h-[calc(100dvh-2rem)] overflow-y-auto',
            contentClassName,
          )}
        >
          <DialogHeader className={headerClassName}>
            <DialogTitle>{title}</DialogTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </DialogHeader>
          <div className={className}>{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={onEscapeKeyDown}
        className={cn(
          sizeClass[size],
          'max-h-[calc(100dvh-2rem)] overflow-y-auto',
          sheetClass,
          contentClassName,
        )}
      >
        <div aria-hidden className="mx-auto h-1 w-10 rounded-sm bg-border sm:hidden" />
        <div className="flex min-w-0 items-center gap-2.5 sm:block">
          <DialogHeader
            className={cn('min-w-0 flex-1 max-sm:space-y-[3px] max-sm:text-left', headerClassName)}
          >
            <DialogTitle className="max-sm:text-[17px] max-sm:leading-[22px] max-sm:tracking-normal">
              <span className="sm:hidden">{sheetTitle}</span>
              <span className="hidden sm:inline">{title}</span>
            </DialogTitle>
            {sheetDescription && (
              <p className="text-xs leading-[15px] text-[var(--text-faint)] sm:hidden">
                {sheetDescription}
              </p>
            )}
            {description && (
              <p className="hidden text-sm text-muted-foreground sm:block">{description}</p>
            )}
          </DialogHeader>
          <DialogClose className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <div className={className}>{children}</div>
      </DialogContent>
    </Dialog>
  );
};
