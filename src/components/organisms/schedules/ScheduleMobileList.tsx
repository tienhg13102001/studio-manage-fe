import type { ReactNode } from 'react';
import { CalendarDays, ChevronDown, Clock, MapPin, StickyNote } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getSchoolName, type ScheduleResponse } from '../../../types';
import { isScheduleCancelled } from '../../../utils/scheduleConstants';
import { formatDay, timeRange, weekdayShort } from './scheduleHelpers';

interface ScheduleMobileListProps {
  schedules: ScheduleResponse[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (s: ScheduleResponse) => void;
  renderStatus: (s: ScheduleResponse) => ReactNode;
  renderMenu: (s: ScheduleResponse) => ReactNode;
  renderCrew: (s: ScheduleResponse) => ReactNode;
}

/** Mobile schedule cards grouped under date headers ("T7, 13/02/2027 · N lịch"). */
const ScheduleMobileList = ({
  schedules,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
  renderStatus,
  renderMenu,
  renderCrew,
}: ScheduleMobileListProps) => {
  const groups: { key: string; items: ScheduleResponse[] }[] = [];
  for (const s of schedules) {
    const key = s.shootDate.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(s);
    else groups.push({ key, items: [s] });
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <div className="flex items-center gap-2 px-0.5">
            <CalendarDays className="h-4 w-4 text-primary-700 dark:text-primary" />
            <span className="text-[15px] font-bold text-foreground tabular">
              {weekdayShort(g.key)}, {formatDay(g.key)}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{g.items.length} lịch</span>
          </div>
          {g.items.map((s) => {
            const cancelled = isScheduleCancelled(s);
            const school = getSchoolName(s.customer);
            const time = timeRange(s);
            const meta = [
              s.package?.name && `Gói ${s.package.name}`,
              s.customer?.total != null && `${s.customer.total} HS`,
              s.package?.studentsPerCrew && `${s.package.studentsPerCrew} HS/thợ`,
            ].filter(Boolean);
            return (
              <article
                key={s._id}
                className={cn('rounded-[14px] border bg-card p-4', cancelled && 'opacity-60')}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 tabular">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {time || '—'}
                  </span>
                  <span className="ml-auto">{renderStatus(s)}</span>
                  {renderMenu(s)}
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(s)}
                  className={cn(
                    'mt-2 block w-full text-left text-[15px] font-bold text-foreground',
                    cancelled && 'line-through',
                  )}
                >
                  {s.customer?.className ?? '—'}
                  {school && ` · ${school}`}
                </button>
                {meta.length > 0 && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{meta.join(' · ')}</div>
                )}
                {s.location && (
                  <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{s.location}</span>
                  </div>
                )}
                {s.notes && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-[13px] text-foreground/80">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 whitespace-pre-line break-words">{s.notes}</span>
                  </div>
                )}
                <div className="mt-3 border-t pt-3">{renderCrew(s)}</div>
              </article>
            );
          })}
        </section>
      ))}
      <div className="space-y-2.5 pt-1 text-center">
        <p className="text-[12.5px] text-muted-foreground tabular">
          Hiển thị 1–{schedules.length} trong {total} lịch chụp
        </p>
        {hasMore && (
          <Button
            variant="outline"
            className="w-full shadow-none"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? <Spinner size="sm" /> : <ChevronDown />}
            Xem thêm lịch chụp
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScheduleMobileList;
