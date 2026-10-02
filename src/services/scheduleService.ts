import api from './api';
import type {
  ApiResponse,
  BusySchedule,
  PaginatedApiResponse,
  PaginatedResponse,
  PublicScheduleResponse,
  Schedule,
  ScheduleResponse,
  ScheduleStatusCounts,
} from '../types';

export const scheduleService = {
  getAll: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedApiResponse<ScheduleResponse>>('/schedules', { params })
      .then(
        (r) =>
          ({ data: r.data.data, ...r.data.pagination }) as PaginatedResponse<ScheduleResponse> & {
            statusCounts?: ScheduleStatusCounts;
          },
      ),
  getByCustomer: (customer: string) =>
    api
      .get<ApiResponse<ScheduleResponse | null>>(`/schedules/customer/${customer}`)
      .then((r) => r.data.data),
  /** Public (no-auth) endpoint — used by the student self-entry form */
  getPublicByCustomer: (customer: string) =>
    api
      .get<ApiResponse<PublicScheduleResponse | null>>(`/public/schedules/customer/${customer}`)
      .then((r) => r.data.data),
  /** Active schedules on `date` (YYYY-MM-DD) with their crew — for crew availability. */
  getBusy: (date: string, exclude?: string) =>
    api
      .get<ApiResponse<BusySchedule[]>>('/schedules/busy', {
        params: exclude ? { date, exclude } : { date },
      })
      .then((r) => r.data.data),
  getOne: (id: string) =>
    api.get<ApiResponse<ScheduleResponse>>(`/schedules/${id}`).then((r) => r.data.data),
  create: (data: Partial<Schedule>) =>
    api.post<ApiResponse<ScheduleResponse>>('/schedules', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Schedule>) =>
    api.put<ApiResponse<ScheduleResponse>>(`/schedules/${id}`, data).then((r) => r.data.data),
  /** Re-fill "Tiền cọc" / "Đợt 2" on the schedule's contract doc from the class deposit. */
  syncContractDeposit: (id: string) =>
    api
      .post<
        ApiResponse<
          Pick<Schedule, 'contractDocId' | 'contractDepositAmount' | 'contractDepositSyncedAt'>
        >
      >(`/schedules/${id}/sync-contract-deposit`)
      .then((r) => r.data.data),
  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/schedules/${id}`).then((r) => r.data),
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
