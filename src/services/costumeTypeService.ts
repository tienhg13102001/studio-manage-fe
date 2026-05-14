import api from './api';
import type { ApiResponse, CostumeType } from '../types';

export const costumeTypeService = {
  getAll: () => api.get<ApiResponse<CostumeType[]>>('/costume-types').then((r) => r.data.data),
  create: (data: Partial<CostumeType>) =>
    api.post<ApiResponse<CostumeType>>('/costume-types', data).then((r) => r.data.data),
  update: (id: string, data: Partial<CostumeType>) =>
    api.put<ApiResponse<CostumeType>>(`/costume-types/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/costume-types/${id}`),
};
