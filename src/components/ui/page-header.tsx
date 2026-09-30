import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  kicker?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  kicker,
  description,
  action,
  className,
}: PageHeaderProps) => (
  <div
    className={cn(
      'flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6',
      className,
    )}
  >
    <div className="space-y-1.5">
      {kicker && (
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700 dark:text-primary">
          {kicker}
        </span>
      )}
      <h2 className="font-display text-2xl md:text-[28px] font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {action && (
      <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">{action}</div>
    )}
  </div>
);
