import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        warning:
          'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300',
        info: 'border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-300',
        danger: 'border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-300',
        violet: 'border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300',
        pink: 'border-transparent bg-pink-500/15 text-pink-700 dark:text-pink-300',
        neutral: 'border-transparent bg-slate-500/10 text-slate-600 dark:text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
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
