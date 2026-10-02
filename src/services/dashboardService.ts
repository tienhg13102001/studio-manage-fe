import api from './api';
import type { ApiResponse, CustomerStatus, ScheduleStatus, SchoolRef } from '../types';

export interface UpcomingSchedule {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: ScheduleStatus;
  customer?: {
    _id: string;
    className: string;
    schoolId?: SchoolRef | null;
    status?: CustomerStatus;
  };
  leadPhotographer?: { _id: string; name?: string; username: string };
}

export interface DashboardStats {
  totals: { income: number; expense: number; profit: number };
  daily: Array<{ label: string; income: number; expense: number }>;
  customerCount: number;
  scheduleCount: number;
  showSchedules: boolean;
  upcomingSchedules: UpcomingSchedule[];
}

export const dashboardService = {
  getStats: (params?: { userId?: string; months?: number; season?: string }) =>
    api.get<ApiResponse<DashboardStats>>('/dashboard', { params }).then((r) => r.data.data),
};
