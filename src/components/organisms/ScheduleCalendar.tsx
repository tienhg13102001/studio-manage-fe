import { useState, useMemo } from 'react';
import { MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { DOW_VN, SCHEDULE_STATUS_LABEL } from '../../utils/scheduleConstants';

export interface CalendarScheduleItem {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  className: string;
  leadName?: string;
  notes?: string;
}

interface Props {
  items: CalendarScheduleItem[];
  maxBadges?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_BADGE: Record<string, { bg: string; dot: string }> = {
  pending: { bg: 'bg-amber-400/15 text-amber-300 dark:text-amber-300', dot: 'bg-amber-400' },
  confirmed: { bg: 'bg-sky-400/15 text-sky-300 dark:text-sky-300', dot: 'bg-sky-400' },
  completed: {
    bg: 'bg-emerald-400/15 text-emerald-300 dark:text-emerald-300',
    dot: 'bg-emerald-400',
  },
  cancelled: { bg: 'bg-red-400/15 text-red-300 dark:text-red-300', dot: 'bg-red-400' },
};

const ScheduleCalendar = ({ items, maxBadges = 3, onEdit, onDelete }: Props) => {
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const rawFirstDay = new Date(year, month, 1).getDay();
    const firstDay = (rawFirstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return days;
  }, [calendarDate]);

  const byDay = useMemo(() => {
    const map: Record<string, CalendarScheduleItem[]> = {};
    items.forEach((s) => {
      const key = s.shootDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [items]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl overflow-hidden border theme-card-border bg-[var(--card-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b theme-card-border">
        <button
          onClick={() =>
            setCalendarDate(({ year, month }) =>
              month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
            )
          }
          className="w-8 h-8 flex items-center justify-center rounded-lg theme-text-muted hover:bg-[var(--table-row-hover)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold theme-text-primary text-base tracking-wide">
          Tháng {calendarDate.month + 1} / {calendarDate.year}
        </span>
        <button
          onClick={() =>
            setCalendarDate(({ year, month }) =>
              month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
            )
          }
          className="w-8 h-8 flex items-center justify-center rounded-lg theme-text-muted hover:bg-[var(--table-row-hover)] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b theme-card-border bg-[var(--table-head-bg)]">
        {DOW_VN.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-2 ${
              i >= 5 ? 'text-rose-400' : 'theme-text-faint'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[color:var(--card-border)]">
        {calendarDays.map((day, i) => {
          const dayItems = day ? (byDay[day] ?? []) : [];
          const isToday = day === today;
          const isSelected = day === selectedDay;
          const dayNum = day ? parseInt(day.slice(8)) : 0;
          const colIndex = i % 7;
          const isWeekend = colIndex >= 5;

          return (
            <div
              key={i}
              onClick={() => day && setSelectedDay(isSelected ? null : day)}
              className={[
                'min-h-[4.5rem] p-1.5 transition-colors relative',
                !day
                  ? 'bg-[var(--table-head-bg)] cursor-default'
                  : isSelected
                    ? 'cursor-pointer bg-amber-500/10'
                    : isToday
                      ? 'cursor-pointer bg-amber-500/5'
                      : 'cursor-pointer hover:bg-[var(--table-row-hover)]',
              ].join(' ')}
            >
              {isSelected && <span className="absolute inset-x-0 top-0 h-0.5 bg-amber-400" />}
              {day && (
                <>
                  <div className="flex justify-end mb-1">
                    <span
                      className={[
                        'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'text-white' : isWeekend ? 'text-rose-400' : 'theme-text-primary',
                      ].join(' ')}
                      style={isToday ? { background: '#d97706' } : undefined}
                    >
                      {dayNum}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, maxBadges).map((s) => {
                      const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
                      return (
                        <div
                          key={s._id}
                          className={`flex items-center gap-1 text-[10px] truncate rounded px-1 py-0.5 leading-tight ${badge.bg}`}
                          title={s.className}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                          <span className="truncate">{s.className}</span>
                        </div>
                      );
                    })}
                    {dayItems.length > maxBadges && (
                      <div className="text-[10px] theme-text-faint pl-1">
                        +{dayItems.length - maxBadges} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (byDay[selectedDay] ?? []).length > 0 && (
        <div className="border-t theme-card-border p-4">
          <p className="text-xs font-semibold theme-text-faint uppercase tracking-wider mb-3">
            {parseInt(selectedDay.slice(8))} tháng {parseInt(selectedDay.slice(5, 7))},{' '}
            {selectedDay.slice(0, 4)}
          </p>
          <div className="space-y-2">
            {(byDay[selectedDay] ?? []).map((s) => {
              const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
              return (
                <div
                  key={s._id}
                  className="flex items-start justify-between rounded-xl border border-[color:var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 hover:bg-[var(--table-row-hover)] transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-sm theme-text-primary truncate">
                      {s.className}
                    </div>
                    {(s.startTime || s.endTime) && (
                      <div className="text-xs theme-text-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        {s.startTime}
                        {s.endTime ? ` – ${s.endTime}` : ''}
                      </div>
                    )}
                    {s.location && (
                      <div className="text-xs theme-text-muted flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{s.location}</span>
                      </div>
                    )}
                    {s.notes && (
                      <div className="text-[11px] text-amber-400/80 mt-0.5">※ {s.notes}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.bg}`}
                    >
                      {SCHEDULE_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    {(onEdit || onDelete) && (
                      <div className="flex gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(s._id)}
                            className="text-xs theme-text-muted hover:text-amber-400 transition-colors"
                          >
                            Sửa
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(s._id)}
                            className="text-xs theme-text-muted hover:text-red-400 transition-colors"
                          >
                            Xoá
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {selectedDay && (byDay[selectedDay] ?? []).length === 0 && (
        <div className="border-t theme-card-border py-6 text-center theme-text-faint text-sm">
          Không có lịch ngày này
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;
