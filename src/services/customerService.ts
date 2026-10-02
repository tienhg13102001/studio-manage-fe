import api from './api';
import type {
  ApiResponse,
  ChangeCustomerStatusBody,
  Customer,
  CustomerActivity,
  CustomerStatusCounts,
  PaginatedApiResponse,
  PaginatedResponse,
  ScheduleResponse,
  TransactionResponse,
} from '../types';

export interface ChangeCustomerStatusResult {
  customer: Customer;
  activity: CustomerActivity;
  schedule?: ScheduleResponse | null;
  transaction?: TransactionResponse | null;
  warnings: string[];
}

export const customerService = {
  getAll: (params?: Record<string, string | number>, signal?: AbortSignal) =>
    api
      .get<PaginatedApiResponse<Customer>>('/customers', { params, signal })
      .then((r) => ({ data: r.data.data, ...r.data.pagination }) as PaginatedResponse<Customer>),
  getOne: (id: string) =>
    api.get<ApiResponse<Customer>>(`/customers/${id}`).then((r) => r.data.data),
  create: (data: Partial<Customer>) =>
    api.post<ApiResponse<Customer>>('/customers', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Customer>) =>
    api.put<ApiResponse<Customer>>(`/customers/${id}`, data).then((r) => r.data.data),
  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/customers/${id}`).then((r) => r.data),
  getStatusCounts: (params?: Record<string, string>) =>
    api
      .get<ApiResponse<CustomerStatusCounts>>('/customers/status-counts', { params })
      .then((r) => r.data.data),
  getActivities: (id: string) =>
    api
      .get<ApiResponse<CustomerActivity[]>>(`/customers/${id}/activities`)
      .then((r) => r.data.data),
  addNote: (id: string, note: string) =>
    api
      .post<ApiResponse<CustomerActivity>>(`/customers/${id}/notes`, { note })
      .then((r) => r.data.data),
  changeStatus: (id: string, body: ChangeCustomerStatusBody) =>
    api
      .post<ApiResponse<ChangeCustomerStatusResult>>(`/customers/${id}/status`, body)
      .then((r) => r.data.data),
  /** Public (no-auth) endpoint — used by the student self-entry form */
  getPublic: (id: string) =>
    api
      .get<ApiResponse<Pick<Customer, '_id' | 'className' | 'schoolId'>>>(`/public/customers/${id}`)
      .then((r) => r.data.data),
  /** Public (no-auth) endpoint — list all classes (for portfolio / dropdowns) */
  listPublic: () =>
    api
      .get<ApiResponse<Pick<Customer, '_id' | 'className' | 'schoolId'>[]>>(`/public/customers`)
      .then((r) => r.data.data),
};
