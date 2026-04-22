import api from './api';
import type {
  Schedule,
  ScheduleResponse,
  PaginatedResponse,
  PublicScheduleResponse,
} from '../types';

export const scheduleService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<ScheduleResponse>>('/schedules', { params }).then((r) => r.data),
  getByCustomer: (customer: string) =>
    api
      .get<ScheduleResponse | null>(`/schedules/customer/${customer}`)
      .then((r) => r.data),
  /** Public (no-auth) endpoint — used by the student self-entry form */
  getPublicByCustomer: (customer: string) =>
    api
      .get<PublicScheduleResponse | null>(`/public/schedules/customer/${customer}`)
      .then((r) => r.data),
  getOne: (id: string) =>
    api.get<ScheduleResponse>(`/schedules/${id}`).then((r) => r.data),
  create: (data: Partial<Schedule>) =>
    api.post<ScheduleResponse>('/schedules', data).then((r) => r.data),
  update: (id: string, data: Partial<Schedule>) =>
    api.put<ScheduleResponse>(`/schedules/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/schedules/${id}`).then((r) => r.data),
  downloadContract: async (id: string, filename: string) => {
    const res = await api.get(`/schedules/${id}/contract`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hop-dong-${filename}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
