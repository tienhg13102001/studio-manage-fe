// 0: Superadmin | 1: Admin | 2: Sale | 3: Thợ chụp ảnh | 4: Cộng tác viên sale | 5: Kế toán | 6: Thợ quay phim
export type UserRole = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ROLE_LABELS: Record<UserRole, string> = {
  0: 'Superadmin',
  1: 'Admin',
  2: 'Sale',
  3: 'Thợ chụp ảnh',
  4: 'Cộng tác viên sale',
  5: 'Kế toán',
  6: 'Thợ quay phim',
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

/** External collaborator: never receives a system login. */
export interface ExternalPhotographer {
  _id: string;
  name: string;
  phone?: string;
  defaultFee?: number | null;
  notes?: string;
  isActive: boolean;
}

export type ExternalCrewConfirmation = 'pending' | 'confirmed' | 'declined';

export interface ExternalCrewAssignment {
  photographer: string;
  /** 'video' = thợ quay MV (không tính là thợ chụp). */
  role: 'lead' | 'support' | 'video';
  confirmation: ExternalCrewConfirmation;
}

export interface ExternalCrewMember extends Omit<ExternalCrewAssignment, 'photographer'> {
  photographer: Pick<ExternalPhotographer, '_id' | 'name' | 'isActive'> | null;
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
  /** Người tạo lớp — populated `{ _id, name, username }` in responses. */
  createdBy?: string | CustomerSaleRef | null;
  source?: string;
  lostReason?: string;
  statusChangedAt?: string;
  deposit?: { amount: number; date: string };
  /** Ngày dự kiến chụp (ISO) — optional. */
  expectedShootDate?: string | null;
  /** Class contract — `null`/missing when none yet. */
  contract?: CustomerContract | null;
  /** Drive photo folder of the class. */
  driveFolderUrl?: string | null;
  driveFolderId?: string | null;
  createdAt?: string;
}

/** Class info printed on a contract (snapshot at create / update time). */
export interface ContractPrinted {
  className?: string;
  school?: string;
  contactName?: string;
  contactPhone?: string;
  contactAddress?: string;
  total?: number;
  totalMale?: number;
  totalFemale?: number;
}

/** Contract of a class (created via the Apps Script, saved with PUT /customers/:id/contract). */
export interface CustomerContract {
  url: string;
  /** Google Doc id — `null` on legacy contracts (deposit cells can't be updated). */
  docId?: string | null;
  /** Total payment printed on the contract (package + extra services). */
  total?: number | null;
  /** Package id */
  package?: string | null;
  /** Price per member printed on the contract (defaults to the package price). */
  pricePerMember?: number | null;
  shootDate?: string | null;
  location?: string;
  extraServices?: ExtraService[];
  crewCount?: number | null;
  crewCountSystem?: number | null;
  /** Số thợ quay MV in vào hợp đồng (gói có MV = 1). */
  videoCrewCount?: number | null;
  /** Deposit printed on the contract; `null` = left blank "………". */
  depositAmount?: number | null;
  depositSyncedAt?: string | null;
  /** Ngày cọc đang in trên hợp đồng; null = để trống. */
  depositDate?: string | null;
  /** Class info printed on the contract — compared with the class to detect a stale contract. */
  printed?: ContractPrinted | null;
  createdAt?: string | null;
  createdBy?: string | null;
}

/** Body of PUT /customers/:id/contract. */
export type SaveContractBody = Omit<CustomerContract, 'createdAt' | 'createdBy'> & {
  /** Contract URL the client saw (null when creating) — server 409s if it changed meanwhile. */
  expectedUrl: string | null;
};

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
  type?: string | null;
  createdAt?: string;
}

/** Populated Costume returned by GET endpoints (type is populated; null = "Không phân loại"). */
export interface CostumeResponse extends Omit<Costume, 'type'> {
  type?: CostumeType | null;
}

export interface CostumeTypeInput {
  name: string;
  description?: string;
}

export interface CostumeTypeUsage {
  costumeCount: number;
  packageCount: number;
  costumeNames: string[];
  packageNames: string[];
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
  /** Gói có quay MV kỷ yếu (1 thợ quay/lớp). */
  hasMv?: boolean;
  createdAt?: string;
}

/** Kịch bản "Tính lãi gói" (Công cụ). */
export interface ProfitScenarioInput {
  name: string;
  /** Package id (`null` = nhập giá tay). */
  package: string | null;
  pricePerMember: number;
  students: number;
  crewCount: number;
  crewRate: number;
  printCostPerStudent: number;
  costumeCost: number;
  otherCosts: { label: string; amount: number }[];
}

export interface ProfitScenario extends Omit<ProfitScenarioInput, 'package'> {
  _id: string;
  package: Pick<Package, '_id' | 'name' | 'pricePerMember' | 'studentsPerCrew'> | null;
  createdBy?: CustomerSaleRef | null;
  createdAt?: string;
  updatedAt?: string;
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
  externalCrew: ExternalCrewAssignment[];
  /** Thợ quay MV nội bộ (role 6). */
  videographer?: string | null;
  bookedBy: string | null;
  /** Only a cancel flag — the displayed status is the shoot status derived from `customer.status`. */
  status: ScheduleStatus;
  notes?: string;
  season?: string | null;
  extraServices?: ExtraService[];
  createdAt?: string;
}

/** Populated Schedule returned by GET endpoints (backend uses `.populate`). */
export interface ScheduleResponse extends Omit<
  Schedule,
  | 'customer'
  | 'package'
  | 'costumes'
  | 'leadPhotographer'
  | 'supportPhotographers'
  | 'externalCrew'
  | 'videographer'
  | 'bookedBy'
> {
  customer: Customer;
  package: Package | null;
  costumes: Costume[];
  leadPhotographer: User | null;
  supportPhotographers: User[];
  externalCrew: ExternalCrewMember[];
  videographer?: Pick<User, '_id' | 'name' | 'username'> | null;
  bookedBy: User | null;
  /** Only on GET /schedules: crew members who also have another active schedule that day. */
  conflicts?: ScheduleConflict[];
}

/** A crew member double-booked on the same shoot day (GET /schedules). */
export interface ScheduleConflict {
  user: { _id: string; name: string; external?: boolean };
  schedule: { _id: string; className: string; startTime?: string; endTime?: string };
}

/** Schedule counts per shoot status (+ cancelled), from GET /schedules `pagination.statusCounts`. */
export type ScheduleStatusCounts = Record<'deposited' | 'not_shot' | 'shot' | 'cancelled', number>;

/** Active schedule of a day with its crew ids (GET /schedules/busy). */
export interface BusySchedule {
  _id: string;
  className: string;
  startTime?: string;
  endTime?: string;
  leadPhotographer: string | null;
  supportPhotographers: string[];
  externalCrew: ExternalCrewAssignment[];
  videographer?: string | null;
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
  /** Number of transactions (income + expense). */
  count: number;
  incomeCount: number;
  expenseCount: number;
  /** Expenses the accountant hasn't refunded yet. */
  pendingRefund: number;
  pendingRefundCount: number;
}

/** Totals of the whole filtered set (GET /transactions `pagination.totals`). */
export interface TransactionTotals {
  income: number;
  expense: number;
  pendingRefund: number;
  incomeCount: number;
  expenseCount: number;
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

/** Global feedback stats (all feedback). Dist arrays: index 0..4 = count of 1..5 stars. */
export interface FeedbackStats {
  count: number;
  crewAvg: number;
  albumAvg: number;
  crewDist: number[];
  albumDist: number[];
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
