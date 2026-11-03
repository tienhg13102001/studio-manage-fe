import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-600/[0.12] text-emerald-800 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-500/[0.14] text-amber-900 dark:text-amber-300',
        info: 'border-transparent bg-sky-700/[0.12] text-sky-900 dark:bg-sky-400/[0.14] dark:text-sky-200',
        danger: 'border-transparent bg-red-600/[0.12] text-red-800 dark:text-red-300',
        violet: 'border-transparent bg-violet-500/[0.12] text-violet-800 dark:text-violet-300',
        pink: 'border-transparent bg-pink-500/[0.12] text-pink-800 dark:text-pink-300',
        neutral: 'border-transparent bg-stone-500/[0.12] text-stone-700 dark:text-stone-300',
        cyan: 'border-transparent bg-cyan-500/[0.12] text-cyan-800 dark:text-cyan-300',
        teal: 'border-transparent bg-teal-500/[0.12] text-teal-800 dark:text-teal-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  /** Show a leading status dot in the current text color. */
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };

/** Màu chấm trạng thái (bộ lọc, lịch) khớp với màu chữ của Badge cùng variant. */
export const badgeDotClass: Record<
  'neutral' | 'info' | 'violet' | 'warning' | 'cyan' | 'pink' | 'teal' | 'success' | 'danger',
  string
> = {
  neutral: 'bg-stone-400',
  info: 'bg-sky-700 dark:bg-sky-400',
  warning: 'bg-amber-600',
  success: 'bg-emerald-600',
  danger: 'bg-red-600',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
  teal: 'bg-teal-500',
};
