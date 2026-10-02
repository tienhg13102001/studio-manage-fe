// 0: Superadmin | 1: Admin | 2: Sale | 3: Thợ chụp ảnh | 4: Cộng tác viên sale | 5: Kế toán
export type UserRole = 0 | 1 | 2 | 3 | 4 | 5;

export const ROLE_LABELS: Record<UserRole, string> = {
  0: 'Superadmin',
  1: 'Admin',
  2: 'Sale',
  3: 'Thợ chụp ảnh',
  4: 'Cộng tác viên sale',
  5: 'Kế toán',
};

export interface User {
  _id: string;
  username: string;
  name?: string;
  roles: UserRole[];
  isActive: boolean;
  telegramId?: string;
  createdAt?: string;
}

/** School as populated on a class (`customer.schoolId`). */
export interface SchoolRef {
  _id: string;
  name: string;
  address?: string;
}

export interface School extends SchoolRef {
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  _id: string;
  className: string;
  /** Populated `{ _id, name, address }` in responses; plain id in create/update payloads. */
  schoolId?: string | SchoolRef | null;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  total: number;
  totalMale?: number;
  totalFemale?: number;
  notes?: string;
  season?: string | null;
  /** Pipeline status — missing on old data, treat as `new` (use `getCustomerStatus`). */
  status?: CustomerStatus;
  assignedSale?: string | CustomerSaleRef | null;
  source?: string;
  lostReason?: string;
  statusChangedAt?: string;
  deposit?: { amount: number; date: string };
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Customer pipeline (quy trình chăm sóc lớp)
// ---------------------------------------------------------------------------

export type CustomerStatus =
  | 'new'
  | 'contacting'
  | 'contacted'
  | 'deposited'
  | 'scheduled'
  | 'shot'
  | 'awaiting_print'
  | 'done'
  | 'lost';

/** Main flow order (excludes the `lost` side branch). */
export const CUSTOMER_STATUS_ORDER: Exclude<CustomerStatus, 'lost'>[] = [
  'new',
  'contacting',
  'contacted',
  'deposited',
  'scheduled',
  'shot',
  'awaiting_print',
  'done',
];

/** Every status incl. `lost`, in display order. */
export const CUSTOMER_STATUSES: CustomerStatus[] = [...CUSTOMER_STATUS_ORDER, 'lost'];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  new: 'Chưa làm việc',
  contacting: 'Bắt đầu liên hệ',
  contacted: 'Đã liên hệ',
  deposited: 'Đã cọc',
  scheduled: 'Chưa chụp',
  shot: 'Đã chụp',
  awaiting_print: 'Chưa trả ảnh in',
  done: 'Hoàn thành',
  lost: 'Không chốt',
};

export const CUSTOMER_STATUS_VARIANT: Record<
  CustomerStatus,
  'neutral' | 'info' | 'violet' | 'warning' | 'cyan' | 'pink' | 'teal' | 'success' | 'danger'
> = {
  new: 'neutral',
  contacting: 'info',
  contacted: 'violet',
  deposited: 'warning',
  scheduled: 'cyan',
  shot: 'pink',
  awaiting_print: 'teal',
  done: 'success',
  lost: 'danger',
};

/** Statuses from which the `lost` side branch is allowed. */
export const CUSTOMER_LOSABLE_STATUSES: CustomerStatus[] = ['new', 'contacting', 'contacted'];

export const getCustomerStatus = (c: Pick<Customer, 'status'> | null | undefined): CustomerStatus =>
  c?.status ?? 'new';

/** Display name of a (possibly unpopulated) user reference. */
export const getUserRefName = (u: string | CustomerSaleRef | null | undefined): string | null =>
  u && typeof u === 'object' ? u.name || u.username : null;

/** School name of a class ('' when none) — use instead of reading `schoolId` directly. */
export const getSchoolName = (c: Pick<Customer, 'schoolId'> | null | undefined): string =>
  c?.schoolId && typeof c.schoolId === 'object' ? c.schoolId.name : '';

/** School id of a class (populated or not). */
export const getSchoolId = (c: Pick<Customer, 'schoolId'> | null | undefined): string | null =>
  !c?.schoolId ? null : typeof c.schoolId === 'object' ? c.schoolId._id : c.schoolId;

/** Id of a (possibly populated) user reference. */
export const getUserRefId = (u: string | CustomerSaleRef | null | undefined): string | null =>
  !u ? null : typeof u === 'object' ? u._id : u;

export interface CustomerSaleRef {
  _id: string;
  name?: string;
  username: string;
}

export interface CustomerActivity {
  _id: string;
  customer: string;
  kind: 'status' | 'note' | 'system';
  fromStatus?: CustomerStatus;
  toStatus?: CustomerStatus;
  note: string;
  createdBy?: CustomerSaleRef | string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ChangeCustomerStatusBody {
  status: CustomerStatus;
  note: string;
  lostReason?: string;
  deposit?: { amount: number; date: string };
  /** Admin only — (re)assign the sale in charge (user id). */
  assignedSale?: string;
  schedule?: {
    package: string;
    shootDate: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    leadPhotographer?: string;
    supportPhotographers?: string[];
  };
}

export type CustomerStatusCounts = Record<CustomerStatus, number>;

export interface CostumeType {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Costume {
  _id: string;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  type?: string;
  createdAt?: string;
}

/** Populated Costume returned by GET endpoints (type is populated). */
export interface CostumeResponse extends Omit<Costume, 'type'> {
  type?: CostumeType;
}

export interface Package {
  _id: string;
  name: string;
  pricePerMember: number;
  duration?: 'full_day' | 'half_day' | 'two_thirds_day';
  costumes?: CostumeType[];
  crewRatio?: string;
  editingScope?: 'full' | 'partial';
  deliveryDays?: number;
  studentsPerCrew?: number;
  description?: string;
  isPopular?: boolean;
  createdAt?: string;
}

export interface ExtraService {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note?: string;
}

export type ScheduleStatus = 'active' | 'cancelled';

/**
 * Schedule model — relations are stored as ObjectId strings.
 * Use this type for create/update payloads.
 * For populated GET responses, use `ScheduleResponse` instead.
 */
export interface Schedule {
  _id: string;
  customer: string;
  package: string | null;
  costumes: string[];
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  leadPhotographer: string | null;
  supportPhotographers: string[];
  bookedBy: string | null;
  /** Only a cancel flag — the displayed status is the class pipeline status (`customer.status`). */
  status: ScheduleStatus;
  notes?: string;
  season?: string | null;
  contractUrl?: string;
  driveFolderUrl?: string;
  driveFolderId?: string;
  extraServices?: ExtraService[];
  createdAt?: string;
}

/** Populated Schedule returned by GET endpoints (backend uses `.populate`). */
export interface ScheduleResponse extends Omit<
  Schedule,
  'customer' | 'package' | 'costumes' | 'leadPhotographer' | 'supportPhotographers' | 'bookedBy'
> {
  customer: Customer;
  package: Package | null;
  costumes: Costume[];
  leadPhotographer: User | null;
  supportPhotographers: User[];
  bookedBy: User | null;
}

export interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  isDefault: boolean;
  createdBy?: string;
}

/**
 * Transaction model — relations are stored as ObjectId strings.
 * Use this type for create/update payloads.
 * For populated GET responses, use `TransactionResponse` instead.
 */
export interface Transaction {
  _id: string;
  customer: string | null;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  description?: string;
  date: string;
  createdBy: string | null;
  accountantRefunded?: boolean;
  season?: string | null;
  createdAt?: string;
}

/** Populated Transaction returned by GET endpoints. */
export interface TransactionResponse extends Omit<
  Transaction,
  'customer' | 'categoryId' | 'createdBy'
> {
  customer: Customer | null;
  categoryId: Category;
  createdBy: User | null;
}

export interface TransactionSummaryRow {
  _id: string | null;
  customer?: Customer;
  income: number;
  expense: number;
  profit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalMale?: number;
  totalFemale?: number;
}

export interface Student {
  _id: string;
  customer: string;
  name: string;
  gender: 'male' | 'female';
  height?: number;
  weight?: number;
  notes?: string;
  costumes: string[];
  createdAt?: string;
}

/** Populated Student returned by GET endpoints. */
export interface StudentResponse extends Omit<Student, 'costumes'> {
  costumes: Costume[];
}

export interface FeedbackItem {
  rating: number;
  description?: string;
}

export interface Feedback {
  _id: string;
  customer: string | null;
  phone?: string;
  crewFeedback: FeedbackItem;
  albumFeedback: FeedbackItem;
  content?: string;
  suggestion?: string;
  isRead: boolean;
  createdAt: string;
}

/** Populated Feedback returned by GET endpoints. */
export interface FeedbackResponse extends Omit<Feedback, 'customer'> {
  customer: Customer | null;
}

export interface Season {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
}

/**
 * Public (unauthenticated) schedule shape returned by `/public/schedules/:customer`.
 * Intentionally narrower than `ScheduleResponse` to avoid leaking staff / booking info.
 */
export interface PublicScheduleResponse {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: Schedule['status'];
  customer: Pick<Customer, '_id' | 'className' | 'schoolId'>;
  costumes: Costume[];
  package: {
    _id: string;
    name: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Standard API response envelopes (matches backend sendResponse utility)
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalMale?: number;
  totalFemale?: number;
  totalRead?: number;
  totalUnread?: number;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationMeta;
}
