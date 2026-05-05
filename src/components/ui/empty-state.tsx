import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-16 text-center text-muted-foreground',
      className,
    )}
  >
    <span className="text-3xl mb-3 text-muted-foreground/70" aria-hidden>
      {icon ?? <Inbox className="h-10 w-10" />}
    </span>
    <p className="text-sm font-medium text-foreground">{title}</p>
    {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
