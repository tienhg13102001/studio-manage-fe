import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock, List, MapPin, Users } from 'lucide-react';
import type { UpcomingSchedule } from '../../services/dashboardService';
import { SCHEDULE_CANCELLED_LABEL, isScheduleCancelled } from '../../utils/scheduleConstants';
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_VARIANT,
  getCustomerStatus,
  getSchoolName,
} from '../../types';
import { ScheduleCalendar } from '../organisms';
import { Badge, SegmentedControl } from '@/components/ui';
import { cn } from '@/lib/utils';

// ── Date helpers (lịch lưu shootDate ở 00:00 UTC của ngày chụp) ──────────────

const pad = (n: number) => String(n).padStart(2, '0');
const localKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shootKey = (s: UpcomingSchedule) => s.shootDate.slice(0, 10);
const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const dayLabel = (key: string, todayKey: string, tomorrowKey: string) => {
  if (key === todayKey) return 'Hôm nay';
  if (key === tomorrowKey) return 'Ngày mai';
  const d = keyToDate(key);
  return `${WEEKDAY_LONG[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

const shortDate = (key: string) => {
  const d = keyToDate(key);
  return `${WEEKDAY_SHORT[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

/** Phút hiện tại; tự cập nhật mỗi 30 giây để đếm ngược không bị đứng. */
const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};

// ── Schedule field helpers ───────────────────────────────────────────────────

const leadOf = (s: UpcomingSchedule) => {
  if (s.leadPhotographer) return { name: s.leadPhotographer.name ?? s.leadPhotographer.username };
  const ext = s.externalCrew?.find((e) => e.role === 'lead')?.photographer;
  return ext ? { name: ext.name, external: true } : null;
};

const pendingCrew = (s: UpcomingSchedule) =>
  s.externalCrew?.filter((e) => e.confirmation === 'pending' && e.photographer).length ?? 0;

const timeRange = (s: UpcomingSchedule) =>
  s.startTime ? `${s.startTime}${s.endTime ? ` – ${s.endTime}` : ''}` : 'Chưa đặt giờ';

const classTitle = (s: UpcomingSchedule) => {
  const school = getSchoolName(s.customer);
  return `${s.customer?.className ?? '—'}${school ? ` · ${school}` : ''}`;
};

function StatusBadge({ s }: { s: UpcomingSchedule }) {
  if (isScheduleCancelled(s)) {
    return (
      <Badge variant="danger" dot>
        {SCHEDULE_CANCELLED_LABEL}
      </Badge>
    );
  }
  const status = getCustomerStatus(s.customer);
  return (
    <Badge variant={CUSTOMER_STATUS_VARIANT[status]} dot>
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Bọc nội dung bằng Link tới lớp khi người dùng có quyền xem chi tiết lớp. */
function MaybeLink({
  to,
  className,
  children,
}: {
  to: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return to ? (
    <Link to={to} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

// ── Week strip ───────────────────────────────────────────────────────────────

function WeekStrip({
  days,
  counts,
  selected,
  todayKey,
  onSelect,
}: {
  days: string[];
  counts: Record<string, number>;
  selected: string;
  todayKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div role="group" aria-label="7 ngày tới" className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {days.map((key) => {
        const d = keyToDate(key);
        const count = counts[key] ?? 0;
        const isSelected = key === selected;
        const isToday = key === todayKey;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={isSelected}
            aria-label={`${WEEKDAY_LONG[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}${isToday ? ' (hôm nay)' : ''}: ${count ? `${count} buổi chụp` : 'không có buổi chụp'}`}
            className={cn(
              'flex flex-col items-center rounded-xl border pb-2 pt-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isSelected
                ? 'border-foreground bg-foreground text-background'
                : isToday
                  ? 'border-primary bg-card ring-1 ring-inset ring-primary hover:bg-muted/60'
                  : 'bg-card hover:bg-muted/60',
            )}
          >
            <span
              className={cn(
                'text-xs font-medium leading-4',
                isSelected
                  ? 'text-background/75'
                  : isToday
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {isToday ? 'Nay' : WEEKDAY_SHORT[d.getDay()]}
            </span>
            <span className="text-lg font-bold leading-6 tabular sm:text-xl">
              {pad(d.getDate())}
            </span>
            <span className="mt-1 flex h-[5px] items-center gap-[3px]" aria-hidden>
              {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-[5px] w-[5px] rounded-full',
                    isSelected ? 'bg-background' : 'bg-foreground/60',
                  )}
                />
              ))}
              {count > 3 && (
                <span
                  className={cn(
                    'text-xs font-bold leading-none',
                    isSelected ? 'text-background' : 'text-foreground/70',
                  )}
                >
                  {count - 3}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Next shoot ───────────────────────────────────────────────────────────────

function NextShoot({
  s,
  now,
  todayKey,
  tomorrowKey,
  href,
}: {
  s: UpcomingSchedule;
  now: Date;
  todayKey: string;
  tomorrowKey: string;
  href: string | null;
}) {
  const key = shootKey(s);
  const nowMin = toMinutes(hhmm(now));
  let relative: string | null = null;
  let live = false;
  if (key === todayKey && s.startTime) {
    const start = toMinutes(s.startTime);
    if (start > nowMin) {
      const diff = start - nowMin;
      const h = Math.floor(diff / 60);
      relative = `còn ${h ? `${h} giờ ` : ''}${diff % 60} phút`;
    } else {
      live = true;
      relative = 'đang diễn ra';
    }
  }
  const lead = leadOf(s);
  const pending = pendingCrew(s);
  const video = s.videographer ? (s.videographer.name ?? s.videographer.username) : null;

  return (
    <MaybeLink
      to={href}
      className={cn(
        'group block rounded-lg border bg-card p-4 transition-colors sm:p-5',
        href && 'hover:border-foreground/40',
      )}
    >
      <h3 className="sr-only">Buổi chụp kế tiếp</h3>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="text-[40px] font-bold leading-none tracking-tight tabular">
            {s.startTime ?? shortDate(key).split(' ')[1]}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {dayLabel(key, todayKey, tomorrowKey)}
            </span>
            {s.endTime && s.startTime
              ? ` · đến ${s.endTime}`
              : !s.startTime
                ? ' · chưa đặt giờ'
                : null}
            {relative && (
              <span
                className={cn(
                  'font-semibold',
                  live ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground',
                )}
              >
                {' · '}
                {relative}
              </span>
            )}
          </span>
        </div>
        <div className="shrink-0 whitespace-nowrap">
          <StatusBadge s={s} />
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1 text-[15px] font-semibold text-foreground">
        <span className="truncate">{classTitle(s)}</span>
        {href && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </p>
      <div className="mt-1.5 space-y-1 text-sm text-muted-foreground">
        {s.location && (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{s.location}</span>
          </p>
        )}
        <p className="flex items-start gap-1.5">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {lead ? (
              <>
                {lead.name}
                {lead.external && ' (thợ ngoài)'}
              </>
            ) : (
              <span className="text-red-700 dark:text-red-300">Chưa có thợ chính</span>
            )}
            {video && ` · Quay: ${video}`}
            {pending > 0 && (
              <span className="text-amber-800 dark:text-amber-300">
                {' '}
                · {pending} thợ ngoài chờ xác nhận
              </span>
            )}
          </span>
        </p>
      </div>
    </MaybeLink>
  );
}

// ── Day rows ─────────────────────────────────────────────────────────────────

function ScheduleRow({
  s,
  href,
  dateLabel,
}: {
  s: UpcomingSchedule;
  href: string | null;
  dateLabel?: string;
}) {
  const cancelled = isScheduleCancelled(s);
  const lead = leadOf(s);
  return (
    <li>
      <MaybeLink
        to={href}
        className={cn(
          '-mx-2 flex items-start gap-3 rounded-md px-2 py-3 transition-colors',
          href && 'hover:bg-muted/60',
        )}
      >
        <div className="w-[52px] shrink-0">
          {dateLabel && (
            <p className="text-xs font-medium leading-4 text-muted-foreground">{dateLabel}</p>
          )}
          <p
            className={cn(
              'text-[15px] font-bold leading-5 tabular',
              cancelled && 'text-muted-foreground line-through',
            )}
          >
            {s.startTime ?? '--:--'}
          </p>
        </div>
        <div className={cn('min-w-0 flex-1', cancelled && 'opacity-60')}>
          <p className={cn('truncate text-sm font-semibold', cancelled && 'line-through')}>
            {classTitle(s)}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
            {s.endTime && s.startTime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                {timeRange(s)}
              </span>
            )}
            {s.location && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{s.location}</span>
              </span>
            )}
            {lead && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden />
                {lead.name}
                {lead.external && ' · ngoài'}
              </span>
            )}
          </p>
          <div className="mt-1.5 sm:hidden">
            <StatusBadge s={s} />
          </div>
        </div>
        <div className="hidden shrink-0 sm:block">
          <StatusBadge s={s} />
        </div>
      </MaybeLink>
    </li>
  );
}

// ── Composite ────────────────────────────────────────────────────────────────

interface WeekAgendaProps {
  schedules: UpcomingSchedule[];
  /** Có quyền mở trang chi tiết lớp (`/customers/:id`). */
  canOpenCustomer: boolean;
}

export function WeekAgenda({ schedules, canOpenCustomer }: WeekAgendaProps) {
  const now = useNow();
  const todayKey = localKey(now);
  const days = useMemo(() => {
    const base = keyToDate(todayKey);
    return Array.from({ length: 7 }, (_, i) =>
      localKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)),
    );
  }, [todayKey]);
  const tomorrowKey = days[1];
  const lastKey = days[6];

  const [selected, setSelected] = useState(todayKey);
  const [view, setView] = useState<'day' | 'calendar'>('day');
  // Qua nửa đêm khi đang mở trang: chuyển lựa chọn về hôm nay mới.
  useEffect(() => setSelected(todayKey), [todayKey]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of schedules) {
      if (isScheduleCancelled(s)) continue;
      c[shootKey(s)] = (c[shootKey(s)] ?? 0) + 1;
    }
    return c;
  }, [schedules]);

  const next = useMemo(() => {
    const nowMin = toMinutes(hhmm(now));
    return schedules.find((s) => {
      if (isScheduleCancelled(s)) return false;
      const k = shootKey(s);
      if (k > todayKey) return true;
      if (k < todayKey) return false;
      if (s.endTime) return toMinutes(s.endTime) >= nowMin;
      return !s.startTime || toMinutes(s.startTime) + 180 >= nowMin;
    });
  }, [schedules, now, todayKey]);

  const dayAll = schedules.filter((s) => shootKey(s) === selected);
  const dayItems = dayAll.filter((s) => s._id !== next?._id);
  const nextInDay = dayItems.length !== dayAll.length;
  const dayCancelled = dayAll.filter(isScheduleCancelled).length;
  const later = schedules.filter(
    (s) => shootKey(s) > lastKey && !isScheduleCancelled(s) && s._id !== next?._id,
  );
  const weekTotal = days.reduce((n, k) => n + (counts[k] ?? 0), 0);

  const hrefOf = (s: UpcomingSchedule) =>
    canOpenCustomer && s.customer?._id ? `/customers/${s.customer._id}` : null;

  const calendarItems = useMemo(
    () =>
      schedules.map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        status: s.customer?.status,
        cancelled: isScheduleCancelled(s),
        className: s.customer?.className ?? '—',
        leadName: leadOf(s)?.name,
      })),
    [schedules],
  );

  return (
    <section aria-labelledby="agenda-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="agenda-title" className="min-w-0 truncate font-display text-lg font-bold">
          7 ngày tới
          <span className="ml-2 text-xs font-medium text-muted-foreground sm:text-sm">
            {weekTotal ? `${weekTotal} buổi chụp` : 'trống lịch'}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <SegmentedControl
            value={view}
            onChange={setView}
            className="shrink-0 [&>button]:min-w-0 [&>button]:px-2.5 sm:[&>button]:px-3"
            items={[
              { value: 'day', label: 'Theo ngày', icon: <List className="h-3.5 w-3.5" /> },
              {
                value: 'calendar',
                label: 'Lịch',
                icon: <CalendarDays className="h-3.5 w-3.5" />,
              },
            ]}
          />
          <Link
            to="/schedules"
            className="whitespace-nowrap text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground max-sm:hidden"
          >
            Xem tất cả
          </Link>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="rounded-lg border bg-card p-3 sm:p-5">
          <ScheduleCalendar items={calendarItems} maxBadges={2} />
        </div>
      ) : (
        <>
          <WeekStrip
            days={days}
            counts={counts}
            selected={selected}
            todayKey={todayKey}
            onSelect={setSelected}
          />

          {next ? (
            <NextShoot
              s={next}
              now={now}
              todayKey={todayKey}
              tomorrowKey={tomorrowKey}
              href={hrefOf(next)}
            />
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
              Chưa có buổi chụp nào sắp tới.{' '}
              <Link
                to="/schedules"
                className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
              >
                Mở trang Lịch chụp
              </Link>
            </div>
          )}

          <div className="rounded-lg border bg-card px-4 pb-2 pt-4 sm:px-5">
            <h3 className="text-sm font-semibold">
              {dayLabel(selected, todayKey, tomorrowKey)}
              <span className="ml-1.5 font-normal text-muted-foreground">
                ·{' '}
                {nextInDay
                  ? dayItems.some((s) => !isScheduleCancelled(s))
                    ? `${(counts[selected] ?? 1) - 1} buổi khác`
                    : 'chỉ có buổi kế tiếp'
                  : counts[selected]
                    ? `${counts[selected]} buổi`
                    : 'không có buổi chụp'}
                {dayCancelled > 0 && ` · ${dayCancelled} đã huỷ`}
              </span>
            </h3>
            {dayItems.length ? (
              <ul className="mt-1 divide-y">
                {dayItems.map((s) => (
                  <ScheduleRow key={s._id} s={s} href={hrefOf(s)} />
                ))}
              </ul>
            ) : (
              <p className="pb-3 pt-2 text-sm text-muted-foreground">
                {nextInDay ? 'Không còn buổi nào khác trong ngày.' : 'Ngày này trống lịch.'}
                {!nextInDay && weekTotal > 0 && ' Ngày có chấm là ngày có buổi chụp.'}
              </p>
            )}
          </div>

          {later.length > 0 && (
            <div className="rounded-lg border bg-card px-4 pb-2 pt-4 sm:px-5">
              <h3 className="text-sm font-semibold">Sau đó</h3>
              <ul className="mt-1 divide-y">
                {later.slice(0, 5).map((s) => (
                  <ScheduleRow
                    key={s._id}
                    s={s}
                    href={hrefOf(s)}
                    dateLabel={shortDate(shootKey(s))}
                  />
                ))}
              </ul>
              <Link
                to="/schedules"
                className="flex items-center justify-center gap-1 border-t py-3 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
              >
                Xem tất cả lịch chụp
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
