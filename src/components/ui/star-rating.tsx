import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAR_LABELS = ['Chưa đánh giá', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}

export const StarRating = ({ value, onChange, className }: StarRatingProps) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex gap-0.5 md:gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-label={`${n} sao`}
            onMouseEnter={() => setHovered(n)}
            onClick={() => onChange(n)}
            className="focus:outline-none transition-transform hover:scale-125 active:scale-110"
          >
            <Star
              className={cn(
                'h-10 w-10 transition-colors duration-150',
                n <= active
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-muted text-muted-foreground/40',
              )}
            />
          </button>
        ))}
      </div>
      <span
        className={cn(
          'text-sm font-semibold transition-colors',
          active > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        )}
      >
        {STAR_LABELS[active]}
      </span>
    </div>
  );
};
