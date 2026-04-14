import { useState, useMemo } from 'react';
import {
  MONTH_VN,
  DOW_VN,
  SCHEDULE_STATUS_LABEL,
  SCHEDULE_STATUS_COLOR,
} from '../../utils/scheduleConstants';

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
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            setCalendarDate(({ year, month }) =>
              month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
            )
          }
          className="btn-secondary px-3 py-1 text-sm"
        >
          ‹
        </button>
        <span className="font-semibold text-gray-800 text-lg">
          {MONTH_VN[calendarDate.month]} {calendarDate.year}
        </span>
        <button
          onClick={() =>
            setCalendarDate(({ year, month }) =>
              month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
            )
          }
          className="btn-secondary px-3 py-1 text-sm"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_VN.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {calendarDays.map((day, i) => {
          const dayItems = day ? (byDay[day] ?? []) : [];
          const isToday = day === today;
          const isSelected = day === selectedDay;
          return (
            <div
              key={i}
              onClick={() => day && setSelectedDay(isSelected ? null : day)}
              className={`bg-white min-h-[5rem] p-1.5 transition-colors ${
                !day ? 'bg-gray-50 cursor-default' : 'cursor-pointer hover:bg-primary-50'
              } ${isSelected ? 'ring-2 ring-inset ring-primary-400' : ''}`}
            >
              {day && (
                <>
                  <div
                    className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-primary-600 text-white' : 'text-gray-700'
                    }`}
                  >
                    {parseInt(day.slice(8))}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, maxBadges).map((s) => (
                      <div
                        key={s._id}
                        className={`text-xs truncate rounded px-1 py-0.5 leading-tight ${
                          SCHEDULE_STATUS_COLOR[s.status] ?? 'bg-gray-100 text-gray-700'
                        }`}
                        title={s.className}
                      >
                        {s.className}
                      </div>
                    ))}
                    {dayItems.length > maxBadges && (
                      <div className="text-xs text-gray-400 pl-1">
                        +{dayItems.length - maxBadges}
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
        <div className="mt-4 border-t pt-4">
          <h3 className="font-semibold text-gray-800 mb-3">
            Lịch ngày {parseInt(selectedDay.slice(8))}/{parseInt(selectedDay.slice(5, 7))}/
            {selectedDay.slice(0, 4)}
          </h3>
          <div className="space-y-2">
            {(byDay[selectedDay] ?? []).map((s) => (
              <div
                key={s._id}
                className="flex items-start justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-sm text-gray-900">{s.className}</div>
                  {(s.startTime || s.endTime) && (
                    <div className="text-xs text-gray-500">
                      ⏰ {s.startTime}
                      {s.endTime ? ` – ${s.endTime}` : ''}
                    </div>
                  )}
                  {s.location && <div className="text-xs text-gray-500">📍 {s.location}</div>}
                  {s.leadName && <div className="text-xs text-gray-500">Leader: {s.leadName}</div>}
                  {s.notes && (
                    <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-1 py-0.5 mt-1">
                      {s.notes}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-3">
                  <span className={`badge ${SCHEDULE_STATUS_COLOR[s.status] ?? ''}`}>
                    {SCHEDULE_STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  {(onEdit || onDelete) && (
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(s._id)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Sửa
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(s._id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Xoá
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedDay && (byDay[selectedDay] ?? []).length === 0 && (
        <div className="mt-4 border-t pt-4 text-center text-gray-400 text-sm">
          Không có lịch ngày này
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;
