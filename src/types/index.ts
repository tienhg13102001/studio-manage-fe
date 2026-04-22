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
  createdAt?: string;
}

export interface Customer {
  _id: string;
  className: string;
  school?: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  total: number;
  totalMale?: number;
  totalFemale?: number;
  notes?: string;
  createdAt?: string;
}

export interface Costume {
  _id: string;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  createdAt?: string;
}

export interface Package {
  _id: string;
  name: string;
  pricePerMember: number;
  duration?: 'full_day' | 'half_day' | 'two_thirds_day';
  costumes?: Costume[];
  crewRatio?: string;
  editingScope?: 'full' | 'partial';
  deliveryDays?: number;
  studentsPerCrew?: number;
  description?: string;
  createdAt?: string;
}

/**
 * Schedule model — relations are stored as ObjectId strings.
 * Use this type for create/update payloads.
 * For populated GET responses, use `ScheduleResponse` instead.
 */
export interface Schedule {
  _id: string;
  customer: string;
  package: string | null;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  leadPhotographer: string | null;
  supportPhotographers: string[];
  bookedBy: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
}

/** Populated Schedule returned by GET endpoints (backend uses `.populate`). */
export interface ScheduleResponse
  extends Omit<
    Schedule,
    'customer' | 'package' | 'leadPhotographer' | 'supportPhotographers' | 'bookedBy'
  > {
  customer: Customer;
  package: Package | null;
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
  createdAt?: string;
}

/** Populated Transaction returned by GET endpoints. */
export interface TransactionResponse
  extends Omit<Transaction, 'customer' | 'categoryId' | 'createdBy'> {
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
  createdAt?: string;
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
  customer: Pick<Customer, '_id' | 'className' | 'school'>;
  package: Pick<Package, '_id' | 'name' | 'costumes'> | null;
}
