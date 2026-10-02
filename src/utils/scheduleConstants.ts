import { CUSTOMER_STATUS_VARIANT, type CustomerStatus } from '../types';

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

/** Class statuses that count as "Đã chụp" on the schedules page. */
export const SHOT_CUSTOMER_STATUSES: CustomerStatus[] = ['shot', 'awaiting_print', 'done'];

/** Shoot status shown on the schedules page — derived from the class pipeline status. */
export const SHOOT_STATUSES = ['deposited', 'not_shot', 'shot'] as const;
export type ShootStatus = (typeof SHOOT_STATUSES)[number];

export const SHOOT_STATUS_LABELS: Record<ShootStatus, string> = {
  deposited: 'Đã cọc',
  not_shot: 'Chưa chụp',
  shot: 'Đã chụp',
};

/** Reuse the pipeline colors so badges stay consistent with the rest of the app. */
export const SHOOT_STATUS_VARIANT: Record<
  ShootStatus,
  (typeof CUSTOMER_STATUS_VARIANT)[CustomerStatus]
> = {
  deposited: CUSTOMER_STATUS_VARIANT.deposited,
  not_shot: CUSTOMER_STATUS_VARIANT.scheduled,
  shot: CUSTOMER_STATUS_VARIANT.shot,
};

/** `deposited` → Đã cọc; shot/awaiting_print/done → Đã chụp; anything else (incl. missing) → Chưa chụp. */
export const toShootStatus = (status: CustomerStatus | null | undefined): ShootStatus => {
  if (status === 'deposited') return 'deposited';
  return status && SHOT_CUSTOMER_STATUSES.includes(status) ? 'shot' : 'not_shot';
};

export const getShootStatus = (s: { customer?: { status?: CustomerStatus } | null }): ShootStatus =>
  toShootStatus(s.customer?.status);

/** Filter value for cancelled schedules (the only schedule-level status). */
export const SCHEDULE_CANCELLED = 'cancelled';
export const SCHEDULE_CANCELLED_LABEL = 'Đã huỷ';

export const isScheduleCancelled = (s: { status?: string } | null | undefined) =>
  s?.status === SCHEDULE_CANCELLED;
