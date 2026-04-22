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

export interface Schedule {
  _id: string;
  customer: string | Customer;
  package?: string | Package;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  leadPhotographer?: string | User;
  supportPhotographers?: (string | User)[];
  bookedBy?: string | User;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  isDefault: boolean;
  createdBy?: string;
}

export interface Transaction {
  _id: string;
  customer?: string | Customer | null;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string | Category;
  description?: string;
  date: string;
  createdBy?: string | User;
  accountantRefunded?: boolean;
  createdAt?: string;
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
  customer?: string | Customer | null;
  phone?: string;
  crewFeedback: FeedbackItem;
  albumFeedback: FeedbackItem;
  content?: string;
  suggestion?: string;
  isRead: boolean;
  createdAt: string;
}
