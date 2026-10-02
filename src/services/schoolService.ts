import api from './api';
import type { ApiResponse, School } from '../types';

export const schoolService = {
  getAll: (params?: { search?: string; limit?: number }, signal?: AbortSignal) =>
    api.get<ApiResponse<School[]>>('/schools', { params, signal }).then((r) => r.data.data),
  /** Returns the existing school when one with the same (normalized) name already exists. */
  create: (data: Pick<School, 'name'> & Partial<Pick<School, 'address' | 'note'>>) =>
    api.post<ApiResponse<School>>('/schools', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Pick<School, 'name' | 'address' | 'note'>>) =>
    api.put<ApiResponse<School>>(`/schools/${id}`, data).then((r) => r.data.data),
};
