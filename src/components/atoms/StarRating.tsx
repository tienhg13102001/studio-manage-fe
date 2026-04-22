import { useState } from 'react';

const STAR_LABELS = ['Chưa đánh giá', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
}

const StarRating = ({ value, onChange }: StarRatingProps) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex items-center gap-4">
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
            <svg
              viewBox="0 0 24 24"
              className={`w-10 h-10 drop-shadow-sm transition-all duration-150 ${
                n <= active ? 'fill-amber-400' : 'fill-slate-200'
              }`}
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        ))}
      </div>
      <span
        className={`font-semibold transition-colors ${
          active > 0 ? 'text-amber-600' : 'text-slate-400'
        }`}
        style={{ fontSize: '14px' }}
      >
        {STAR_LABELS[active]}
      </span>
    </div>
  );
};

export default StarRating;
