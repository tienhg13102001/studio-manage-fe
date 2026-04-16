import api from './api';

export interface UpcomingSchedule {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  customerId?: { _id: string; className: string; school?: string };
  leadPhotographer?: { _id: string; name?: string; username: string };
}

export interface DashboardStats {
  thisMonth: { income: number; expense: number; profit: number };
  monthly: Array<{ label: string; income: number; expense: number }>;
  granularity: 'day' | 'month';
  customerCount: number;
  scheduleCount: number;
  showSchedules: boolean;
  upcomingSchedules: UpcomingSchedule[];
}

export const dashboardService = {
  getStats: (params?: { userId?: string; months?: number }) =>
    api.get<DashboardStats>('/dashboard', { params }).then((r) => r.data),
};

