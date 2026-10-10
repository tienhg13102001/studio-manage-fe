import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FolderOpen,
  MapPin,
  Pencil,
  Trash2,
  User as UserIcon,
  Users as UsersIcon,
  Video,
} from 'lucide-react';
import { getInitial } from './schedules/scheduleHelpers';
import { cn } from '@/lib/utils';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_VARIANT,
  type CustomerStatus,
} from '../../types';
import {
  DOW_VN,
  SCHEDULE_CANCELLED_LABEL,
  SHOOT_STATUSES,
  SHOOT_STATUS_LABELS,
  SHOOT_STATUS_VARIANT,
  type ShootStatus,
} from '../../utils/scheduleConstants';

export interface CalendarScheduleItem {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  /** Class pipeline status (`customer.status`) — drives the color. */
  status?: CustomerStatus;
  /** Shoot status (schedules page) — when set, overrides `status` for color & label. */
  shootStatus?: ShootStatus;
  /** Cancelled schedules are rendered muted / struck through. */
  cancelled?: boolean;
  className: string;
  leadName?: string;
  notes?: string;
  /** Optional extras shown in the side day panel. */
  school?: string;
  packageName?: string;
  packagePrice?: number;
  supportNames?: string[];
  /** Thợ quay MV (nội bộ hoặc thợ ngoài). */
  videoName?: string;
  driveFolderUrl?: string;
  studentCount?: number;
  /** Crew initials on the event chip (lead first, ringed). */
  crew?: { name: string; lead?: boolean }[];
}

interface Props {
  items: CalendarScheduleItem[];
  maxBadges?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Open the full detail of a schedule (event chip click / title click). */
  onOpen?: (id: string) => void;
  onEditCrew?: (id: string) => void;
  /** Render the selected-day panel beside the grid (lg+) instead of below it. */
  sidePanel?: boolean;
}

type StatusStyle = { chip: string; bar: string; dot: string; badge: string };

/** Colors per Badge variant, so calendar chips match the class status badges. */
const VARIANT_STYLE: Record<(typeof CUSTOMER_STATUS_VARIANT)[CustomerStatus], StatusStyle> = {
  neutral: {
    chip: 'bg-slate-500/10 text-slate-700 dark:text-slate-200',
    bar: 'bg-slate-400',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  },
  info: {
    chip: 'bg-blue-500/10 text-blue-800 dark:text-blue-200',
    bar: 'bg-blue-500',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  },
  violet: {
    chip: 'bg-violet-500/10 text-violet-800 dark:text-violet-200',
    bar: 'bg-violet-500',
    dot: 'bg-violet-500',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
  warning: {
    chip: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  },
  cyan: {
    chip: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-200',
    bar: 'bg-cyan-500',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  },
  pink: {
    chip: 'bg-pink-500/10 text-pink-800 dark:text-pink-200',
    bar: 'bg-pink-500',
    dot: 'bg-pink-500',
    badge: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  },
  teal: {
    chip: 'bg-teal-500/10 text-teal-800 dark:text-teal-200',
    bar: 'bg-teal-500',
    dot: 'bg-teal-500',
    badge: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
  success: {
    chip: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  danger: {
    chip: 'bg-rose-500/10 text-rose-800 dark:text-rose-200',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
};

const CANCELLED_STYLE: StatusStyle = {
  chip: 'bg-muted text-muted-foreground line-through',
  bar: 'bg-muted-foreground/40',
  dot: 'bg-muted-foreground/40',
  badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};

type StatusItem = Pick<CalendarScheduleItem, 'status' | 'shootStatus' | 'cancelled'>;

const getStyle = (s: StatusItem): StatusStyle => {
  if (s.cancelled) return CANCELLED_STYLE;
  return VARIANT_STYLE[
    s.shootStatus ? SHOOT_STATUS_VARIANT[s.shootStatus] : CUSTOMER_STATUS_VARIANT[s.status ?? 'new']
  ];
};

const getLabel = (s: StatusItem) => {
  if (s.cancelled) return SCHEDULE_CANCELLED_LABEL;
  return s.shootStatus
    ? SHOOT_STATUS_LABELS[s.shootStatus]
    : CUSTOMER_STATUS_LABELS[s.status ?? 'new'];
};

const DOW_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (key: string) =>
  new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10));

const StatusPill = ({ item }: { item: StatusItem }) => {
  const st = getStyle(item);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        st.badge,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getLabel(item)}
    </span>
  );
};

const ScheduleCalendar = ({
  items,
  maxBadges = 3,
  onEdit,
  onDelete,
  onOpen,
  onEditCrew,
  sidePanel = false,
}: Props) => {
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const today = toKey(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(() => (sidePanel ? today : null));

  /** Full weeks (Mon–Sun), including leading/trailing days of adjacent months. */
  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    return Array.from({ length: cells }, (_, i) => {
      const d = new Date(year, month, 1 - firstDay + i);
      return { key: toKey(d), inMonth: d.getMonth() === month };
    });
  }, [calendarDate]);

  const byDay = useMemo(() => {
    const map: Record<string, CalendarScheduleItem[]> = {};
    items.forEach((s) => {
      const key = s.shootDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    );
    return map;
  }, [items]);

  /** Legend = only the statuses actually present, so every chip color is explained. */
  const legend = useMemo(() => {
    const active = items.filter((s) => !s.cancelled);
    // Shoot-status calendars (schedules page) always explain every status
    const shootMode = items.some((s) => s.shootStatus);
    const shoot = new Set(
      shootMode ? SHOOT_STATUSES : active.map((s) => s.shootStatus).filter(Boolean),
    );
    const pipeline = new Set(active.filter((s) => !s.shootStatus).map((s) => s.status ?? 'new'));
    return {
      statuses: [
        ...SHOOT_STATUSES.filter((k) => shoot.has(k)).map((k) => ({
          key: `shoot-${k}`,
          dot: VARIANT_STYLE[SHOOT_STATUS_VARIANT[k]].dot,
          label: SHOOT_STATUS_LABELS[k],
        })),
        ...CUSTOMER_STATUSES.filter((k) => pipeline.has(k)).map((k) => ({
          key: k,
          dot: VARIANT_STYLE[CUSTOMER_STATUS_VARIANT[k]].dot,
          label: CUSTOMER_STATUS_LABELS[k],
        })),
      ],
      cancelled: shootMode || items.some((s) => s.cancelled),
    };
  }, [items]);

  const selectedItems = selectedDay ? (byDay[selectedDay] ?? []) : [];

  const upcoming = useMemo(() => {
    if (!sidePanel || !selectedDay) return [];
    return items
      .filter((s) => s.shootDate.slice(0, 10) > selectedDay)
      .sort((a, b) =>
        (a.shootDate.slice(0, 10) + (a.startTime ?? '')).localeCompare(
          b.shootDate.slice(0, 10) + (b.startTime ?? ''),
        ),
      )
      .slice(0, 3);
  }, [items, selectedDay, sidePanel]);

  const shiftMonth = (delta: number) =>
    setCalendarDate(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () => {
    const now = new Date();
    setCalendarDate({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(today);
  };

  const selectDay = (key: string) => {
    if (sidePanel) setSelectedDay(key);
    else setSelectedDay(key === selectedDay ? null : key);
  };

  const navBtn =
    'inline-flex h-[34px] items-center justify-center rounded-[9px] border bg-card text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5';

  const grid = (
    <div className="overflow-hidden rounded-[14px] border bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          Tháng {calendarDate.month + 1} / {calendarDate.year}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
            {legend.statuses.map((k) => (
              <span key={k.key} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', k.dot)} />
                {k.label}
              </span>
            ))}
            {legend.cancelled && (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', CANCELLED_STYLE.dot)} />
                {SCHEDULE_CANCELLED_LABEL}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className={cn(navBtn, 'w-[34px]')}
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={goToday} className={cn(navBtn, 'px-3')}>
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className={cn(navBtn, 'w-[34px]')}
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-y bg-muted/60">
        {DOW_VN.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:px-3"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(({ key, inMonth }, i) => {
          const dayItems = byDay[key] ?? [];
          const isToday = key === today;
          const isSelected = key === selectedDay;
          const dayNum = parseInt(key.slice(8));
          const isLastCol = i % 7 === 6;

          return (
            <div
              key={key}
              onClick={() => selectDay(key)}
              className={cn(
                'relative min-h-[4.5rem] cursor-pointer border-b p-1 transition-colors sm:min-h-[6.5rem] sm:p-2',
                !isLastCol && 'border-r',
                isSelected
                  ? 'bg-primary-100/70 dark:bg-primary/10'
                  : inMonth
                    ? 'hover:bg-muted/50'
                    : 'bg-muted/40 hover:bg-muted/60',
              )}
            >
              {isSelected && <span className="absolute inset-x-0 top-0 h-[3px] bg-primary" />}
              <div className="mb-1 flex">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular',
                    isToday
                      ? 'bg-foreground text-background'
                      : isSelected
                        ? 'text-primary-700 dark:text-primary'
                        : inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/70',
                  )}
                >
                  {dayNum}
                </span>
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, maxBadges).map((s) => {
                  const st = getStyle(s);
                  return (
                    <div
                      key={s._id}
                      onClick={
                        onOpen
                          ? (e) => {
                              e.stopPropagation();
                              onOpen(s._id);
                            }
                          : undefined
                      }
                      className={cn(
                        'relative truncate rounded-[5px] py-0.5 pl-2 pr-1 text-[10px] font-medium leading-tight sm:text-[11px]',
                        st.chip,
                        !inMonth && 'opacity-70',
                        onOpen && 'hover:brightness-95',
                      )}
                      title={[s.startTime, s.className, s.school].filter(Boolean).join(' ')}
                    >
                      <span
                        className={cn('absolute inset-y-0.5 left-0.5 w-[3px] rounded-full', st.bar)}
                      />
                      {s.startTime && (
                        <span className="mr-1 hidden tabular sm:inline">{s.startTime}</span>
                      )}
                      {s.className}
                      {s.school && !s.crew && <span className="hidden sm:inline"> {s.school}</span>}
                      {s.crew && s.crew.length > 0 && (
                        <span className="mt-0.5 hidden items-center gap-0.5 sm:flex">
                          {s.crew.slice(0, 4).map((c, ci) => (
                            <span
                              key={ci}
                              title={c.name}
                              className={cn(
                                'inline-flex h-4 w-4 items-center justify-center rounded-full bg-card text-[9px] font-bold',
                                c.lead && 'ring-1 ring-current',
                              )}
                            >
                              {getInitial(c.name)}
                            </span>
                          ))}
                          {s.crew.length > 4 && (
                            <span className="text-[9px] font-semibold">+{s.crew.length - 4}</span>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
                {dayItems.length > maxBadges && (
                  <div className="pl-1 text-[10px] text-muted-foreground sm:text-[11px]">
                    +{dayItems.length - maxBadges} lịch nữa
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const actionBtn =
    'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[10px] border bg-card text-[13px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5';

  const renderEventCard = (s: CalendarScheduleItem) => (
    <div
      key={s._id}
      className={cn('rounded-[14px] border bg-card p-4', s.cancelled && 'opacity-60')}
    >
      <div className="flex items-center justify-between gap-2">
        {s.startTime || s.endTime ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground tabular">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {s.startTime}
            {s.endTime ? ` – ${s.endTime}` : ''}
          </span>
        ) : (
          <span />
        )}
        <StatusPill item={s} />
      </div>
      <button
        type="button"
        disabled={!onOpen}
        onClick={() => onOpen?.(s._id)}
        className={cn(
          'mt-2.5 block w-full text-left font-display text-base font-bold tracking-tight text-foreground enabled:hover:text-primary-700 dark:enabled:hover:text-primary',
          s.cancelled && 'line-through',
        )}
      >
        {s.className}
        {s.school ? ` · ${s.school}` : ''}
      </button>
      {s.packageName && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {s.packageName}
          {typeof s.packagePrice === 'number' &&
            ` · ${s.packagePrice.toLocaleString('vi-VN')}₫/thành viên`}
        </div>
      )}
      <dl className="mt-3 space-y-2 text-[13px]">
        {s.location && (
          <div className="flex gap-3">
            <dt className="flex w-24 shrink-0 items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Địa điểm
            </dt>
            <dd className="min-w-0 break-words text-foreground">{s.location}</dd>
          </div>
        )}
        {s.leadName && (
          <div className="flex gap-3">
            <dt className="flex w-24 shrink-0 items-center gap-2 text-muted-foreground">
              <UserIcon className="h-3.5 w-3.5" /> {s.crew ? 'Thợ chính' : 'Leader'}
            </dt>
            <dd className="min-w-0 text-foreground">{s.leadName}</dd>
          </div>
        )}
        {s.supportNames && s.supportNames.length > 0 && (
          <div className="flex gap-3">
            <dt className="flex w-24 shrink-0 items-center gap-2 text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" /> {s.crew ? 'Thợ phụ' : 'Support'}
            </dt>
            <dd className="min-w-0 text-foreground">{s.supportNames.join(', ')}</dd>
          </div>
        )}
        {s.videoName && (
          <div className="flex gap-3">
            <dt className="flex w-24 shrink-0 items-center gap-2 text-muted-foreground">
              <Video className="h-3.5 w-3.5" /> Thợ quay
            </dt>
            <dd className="min-w-0 text-foreground">{s.videoName}</dd>
          </div>
        )}
        {s.driveFolderUrl && (
          <div className="flex gap-3">
            <dt className="flex w-24 shrink-0 items-center gap-2 text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" /> Folder ảnh
            </dt>
            <dd className="min-w-0">
              <a
                href={s.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Mở trên Google Drive <ExternalLink className="h-3 w-3" />
              </a>
            </dd>
          </div>
        )}
      </dl>
      {s.notes && (
        <div className="mt-3 whitespace-pre-line rounded-[10px] bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {s.notes}
        </div>
      )}
      {(onEditCrew || onEdit || onDelete) && (
        <div className="mt-4 flex gap-2">
          {onEditCrew && !s.cancelled && (
            <button type="button" onClick={() => onEditCrew(s._id)} className={actionBtn}>
              <UsersIcon className="h-4 w-4" /> Sửa ekip
            </button>
          )}
          {onEdit && (
            <button type="button" onClick={() => onEdit(s._id)} className={actionBtn}>
              <Pencil className="h-4 w-4" /> Sửa
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(s._id)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border bg-card text-rose-600 transition-colors hover:bg-rose-500/10"
              title="Xoá"
              aria-label="Xoá"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (sidePanel) {
    const selDate = selectedDay ? parseKey(selectedDay) : null;
    const studentTotal = selectedItems.reduce((sum, s) => sum + (s.studentCount ?? 0), 0);
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {grid}
        <div className="space-y-3">
          {selDate && (
            <div className="rounded-[14px] border bg-card px-5 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-700 dark:text-primary">
                {DOW_LONG[selDate.getDay()]}
              </div>
              <div className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
                {selDate.getDate()} tháng {selDate.getMonth() + 1}, {selDate.getFullYear()}
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {selectedItems.length} lịch chụp
                {studentTotal > 0 && ` · ${studentTotal} học sinh`}
              </div>
            </div>
          )}
          {selectedItems.length > 0 ? (
            selectedItems.map(renderEventCard)
          ) : (
            <div className="rounded-[14px] border border-dashed bg-card py-8 text-center text-sm text-muted-foreground">
              Không có lịch ngày này
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="pt-2">
              <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Tiếp theo
              </div>
              <div className="space-y-2">
                {upcoming.map((s) => {
                  const key = s.shootDate.slice(0, 10);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        const d = parseKey(key);
                        setCalendarDate({ year: d.getFullYear(), month: d.getMonth() });
                        setSelectedDay(key);
                      }}
                      className="flex w-full items-center gap-3 rounded-[12px] border bg-card px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary/40"
                    >
                      <span className="font-semibold text-primary-700 tabular dark:text-primary">
                        {key.slice(8, 10)}/{key.slice(5, 7)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {s.className}
                        {s.school ? ` · ${s.school}` : ''}
                      </span>
                      <StatusPill item={s} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {grid}
      {selectedDay && (
        <div className="mt-3">
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {parseInt(selectedDay.slice(8))} tháng {parseInt(selectedDay.slice(5, 7))},{' '}
            {selectedDay.slice(0, 4)}
          </p>
          {selectedItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {selectedItems.map(renderEventCard)}
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed bg-card py-6 text-center text-sm text-muted-foreground">
              Không có lịch ngày này
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;
