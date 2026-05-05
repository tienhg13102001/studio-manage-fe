import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarsProps {
  value: number;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClass = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4' };

export const Stars = ({ value, size = 'sm', className }: StarsProps) => (
  <span className={cn('inline-flex items-center gap-0.5', className)}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          sizeClass[size],
          i < value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
        )}
      />
    ))}
  </span>
);
