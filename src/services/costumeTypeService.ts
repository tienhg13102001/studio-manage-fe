import api from './api';
import type { CostumeType } from '../types';

export const costumeTypeService = {
  getAll: () => api.get<CostumeType[]>('/costume-types').then((r) => r.data),
  create: (data: Partial<CostumeType>) =>
    api.post<CostumeType>('/costume-types', data).then((r) => r.data),
  update: (id: string, data: Partial<CostumeType>) =>
    api.put<CostumeType>(`/costume-types/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/costume-types/${id}`),
};
