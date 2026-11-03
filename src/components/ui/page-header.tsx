import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  /** @deprecated Không còn hiển thị: tiêu đề tự đủ nghĩa (giữ prop để không vỡ trang cũ). */
  kicker?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Đầu trang kiểu chú thích kỷ yếu: tiêu đề serif + một dòng mô tả, gạch mực bên dưới.
 * Trên mobile, topbar đã hiện tên trang nên tiêu đề ở đây ẩn (chỉ còn mô tả + hành động).
 */
export const PageHeader = ({ title, description, action, className }: PageHeaderProps) => (
  <div
    className={cn(
      'mb-5 flex flex-col gap-3 border-b border-foreground/80 pb-3 md:mb-6 md:flex-row md:items-end md:justify-between md:pb-4',
      className,
    )}
  >
    <div className="min-w-0 space-y-1">
      <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground max-md:sr-only">
        {title}
      </h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {action && (
      <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:self-auto">{action}</div>
    )}
  </div>
);
