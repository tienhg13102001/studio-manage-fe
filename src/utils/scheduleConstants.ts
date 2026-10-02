import type { CustomerStatus } from '../types';

export const MONTH_VN = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export const DOW_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const MONTH_LABELS: Record<string, string> = {
  '01': 'T1',
  '02': 'T2',
  '03': 'T3',
  '04': 'T4',
  '05': 'T5',
  '06': 'T6',
  '07': 'T7',
  '08': 'T8',
  '09': 'T9',
  '10': 'T10',
  '11': 'T11',
  '12': 'T12',
};

export const shortLabel = (label: string) => {
  const [, mo] = label.split('-');
  return MONTH_LABELS[mo] ?? label;
};

/** Class (pipeline) statuses that a shoot schedule can be in — used for filters & count chips. */
export const SCHEDULE_CUSTOMER_STATUSES: CustomerStatus[] = [
  'deposited',
  'scheduled',
  'shot',
  'awaiting_print',
  'done',
  'lost',
];

/** Filter value for cancelled schedules (the only schedule-level status). */
export const SCHEDULE_CANCELLED = 'cancelled';
export const SCHEDULE_CANCELLED_LABEL = 'Đã huỷ';

export const isScheduleCancelled = (s: { status?: string } | null | undefined) =>
  s?.status === SCHEDULE_CANCELLED;
