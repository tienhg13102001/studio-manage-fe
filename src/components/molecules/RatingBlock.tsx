import type { FeedbackItem } from '../../types';
import { Stars } from '../atoms';

const ratingColor = (r: number) => {
  if (r >= 4) return 'text-emerald-600';
  if (r >= 3) return 'text-amber-600';
  return 'text-red-600';
};

interface RatingBlockProps {
  label: string;
  item: FeedbackItem;
}

const RatingBlock = ({ label, item }: RatingBlockProps) => (
  <div className="rounded-lg px-3 py-2.5 bg-[var(--input-bg)] border border-[color:var(--input-border)]">
    <div className="flex items-center justify-between gap-2 mb-1">
      <span className="text-xs font-medium uppercase tracking-wide theme-text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <Stars value={item.rating} />
        <span className={`text-xs font-semibold ${ratingColor(item.rating)}`}>{item.rating}/5</span>
      </div>
    </div>
    {item.description && (
      <p className="text-sm whitespace-pre-wrap leading-relaxed theme-text-primary">
        {item.description}
      </p>
    )}
  </div>
);

export default RatingBlock;
