import api from './api';
import type { Package } from '../types';

export const packageService = {
  getAll: () => api.get<Package[]>('/packages').then((r) => r.data),
  getOne: (id: string) => api.get<Package>(`/packages/${id}`).then((r) => r.data),
  create: (data: Partial<Package>) => api.post<Package>('/packages', data).then((r) => r.data),
  update: (id: string, data: Partial<Package>) =>
    api.put<Package>(`/packages/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/packages/${id}`),
};
