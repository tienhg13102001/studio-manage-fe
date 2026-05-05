import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export const Spinner = ({ size = 'md', className }: SpinnerProps) => (
  <Loader2 className={cn('animate-spin', sizeClass[size], className)} aria-hidden />
);

export const PageLoader = () => (
  <div className="flex items-center justify-center py-32">
    <Spinner size="lg" className="text-primary" />
  </div>
);
