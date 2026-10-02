import api from './api';
import type { ApiResponse, CostumeType, CostumeTypeInput, CostumeTypeUsage } from '../types';

export const costumeTypeService = {
  getAll: () => api.get<ApiResponse<CostumeType[]>>('/costume-types').then((r) => r.data.data),
  create: (data: CostumeTypeInput) =>
    api.post<ApiResponse<CostumeType>>('/costume-types', data).then((r) => r.data.data),
  update: (id: string, data: CostumeTypeInput) =>
    api.put<ApiResponse<CostumeType>>(`/costume-types/${id}`, data).then((r) => r.data.data),
  remove: (id: string): Promise<void> =>
    api.delete<ApiResponse<null>>(`/costume-types/${id}`).then(() => undefined),
  getUsage: (id: string) =>
    api.get<ApiResponse<CostumeTypeUsage>>(`/costume-types/${id}/usage`).then((r) => r.data.data),
};
