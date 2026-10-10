import {
  CUSTOMER_STATUS_ORDER,
  type CustomerStatus,
  type ScheduleResponse,
  type User,
} from '../../../types';
import { neededCrewCount } from '../../../utils/crewCount';
import type { ShootStatus } from '../../../utils/scheduleConstants';

export const personName = (u: Pick<User, 'name' | 'username'> | null | undefined) =>
  u?.name || u?.username || '';

/** Vietnamese names: the given name is the last word → use its first letter. */
export const getInitial = (fullName: string) => {
  const words = fullName.trim().split(/\s+/);
  return (words[words.length - 1]?.[0] ?? '?').toUpperCase();
};

const getHue = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

const AVATAR_TONES = [
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
];

export const avatarTone = (name: string) => AVATAR_TONES[getHue(name) % AVATAR_TONES.length];

const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Calendar date of an ISO shoot date, read from its `YYYY-MM-DD` prefix (no timezone shift). */
const isoDay = (iso: string) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

const pad = (n: number) => String(n).padStart(2, '0');

/** "13/02/2027" */
export const formatDay = (iso: string) => {
  const d = isoDay(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** "T7" — short Vietnamese weekday. */
export const weekdayShort = (iso: string) => {
  const d = isoDay(iso);
  return Number.isNaN(d.getTime()) ? '' : DOW_SHORT[d.getDay()];
};

/** "T7 13/02" */
export const formatWeekdayDayMonth = (iso: string) =>
  `${weekdayShort(iso)} ${formatDay(iso).slice(0, 5)}`;

/** "07:30 – 11:30" (or whichever bound is set). */
export const timeRange = (s: { startTime?: string; endTime?: string }) =>
  [s.startTime, s.endTime].filter(Boolean).join(' – ');

/** Day of the shoot in Vietnam time (UTC+7), as `YYYY-MM-DD` — matches the backend busy lookup. */
export const vnDayKey = (iso: string) =>
  new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

export interface CrewStats {
  /** Photographers needed: contract crew count, else computed (null when the package has no `studentsPerCrew`). */
  needed: number | null;
  assigned: number;
  /** Positive when short of photographers. */
  missing: number;
}

export const crewStats = (s: ScheduleResponse): CrewStats => {
  const needed = neededCrewCount(s.customer, s.package?.studentsPerCrew);
  const assigned =
    (s.leadPhotographer ? 1 : 0) +
    s.supportPhotographers.length +
    (s.externalCrew ?? []).filter(
      (entry) => entry.photographer && entry.confirmation !== 'declined',
    ).length;
  return { needed, assigned, missing: needed ? Math.max(needed - assigned, 0) : 0 };
};

/** Names of the double-booked crew members, de-duplicated. */
export const conflictNames = (s: ScheduleResponse) => [
  ...new Set((s.conflicts ?? []).map((c) => c.user.name).filter(Boolean)),
];

export const isOnCrew = (s: ScheduleResponse, userId: string | undefined) =>
  !!userId &&
  (s.leadPhotographer?._id === userId || s.supportPhotographers.some((u) => u._id === userId));

/** Class status sent when picking a shoot status in the quick status picker. */
export const SHOOT_STATUS_TARGET: Record<ShootStatus, CustomerStatus> = {
  deposited: 'deposited',
  not_shot: 'scheduled',
  shot: 'shot',
};

export type StatusPickerRole = 'admin' | 'photographer' | 'staff';

export const statusPickerRole = (roles: number[] | undefined): StatusPickerRole => {
  const r = roles ?? [];
  if (r.includes(0) || r.includes(1)) return 'admin';
  if (r.includes(3) && !r.includes(2) && !r.includes(4)) return 'photographer';
  return 'staff';
};

/**
 * Mirrors POST /customers/:id/status. Returns `null` when allowed, otherwise the reason
 * (empty string = not offered, no explanation needed). Admins may jump anywhere; others only the
 * next pipeline step, and only as the class's sale in charge — or, for photographers,
 * Chưa chụp → Đã chụp on a schedule they're on.
 */
export const moveBlockReason = (
  ctx: { isAdmin: boolean; isPhotographer: boolean; userId?: string; onCrew: boolean },
  current: CustomerStatus,
  target: CustomerStatus,
  assignedSale: string | null,
): string | null => {
  if (current === target) return '';
  if (ctx.isAdmin) return null;
  if (current === 'lost') return 'Chỉ admin mới được mở lại lớp không chốt';
  if (CUSTOMER_STATUS_ORDER[CUSTOMER_STATUS_ORDER.indexOf(current) + 1] !== target) return '';
  if (assignedSale && assignedSale === ctx.userId) return null;
  if (ctx.isPhotographer && ctx.onCrew && current === 'scheduled' && target === 'shot') return null;
  return 'Bạn không phụ trách lớp này';
};

/** Bottom-sheet look for Radix Dialog content on mobile (same as the customers filter sheet). */
export const SHEET_CONTENT_CLS =
  'inset-x-0 bottom-0 left-0 top-auto max-h-[calc(100dvh-2rem)] max-w-none translate-x-0 translate-y-0 gap-4 overflow-y-auto rounded-none rounded-t-[24px] border-0 bg-card px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] duration-300 data-[state=closed]:!slide-out-to-left-0 data-[state=closed]:!slide-out-to-bottom-full data-[state=closed]:!zoom-out-100 data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-bottom-full data-[state=open]:!zoom-in-100 sm:rounded-none sm:rounded-t-[24px] [&>button:last-child]:hidden';

export const apiErrorMessage = (err: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.') =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export interface ScheduleFilters {
  /** Shoot status (`deposited` | `not_shot` | `shot`), `cancelled`, or '' for all. */
  status: string;
  customer: string;
  photographer: string;
  /** "Lịch của tôi": current user is lead or support (overrides `photographer`). */
  mine: boolean;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_SCHEDULE_FILTERS: ScheduleFilters = {
  status: '',
  customer: '',
  photographer: '',
  mine: false,
  dateFrom: '',
  dateTo: '',
};

export type StatusCountKey = ShootStatus | 'cancelled';
