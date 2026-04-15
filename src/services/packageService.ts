import api from './api';
import type { Package } from '../types';

// costumes is sent as string[] (IDs) when creating/updating
type PackagePayload = Omit<Partial<Package>, 'costumes'> & { costumes?: string[] };

export const packageService = {
  getAll: () => api.get<Package[]>('/packages').then((r) => r.data),
  getOne: (id: string) => api.get<Package>(`/packages/${id}`).then((r) => r.data),
  create: (data: PackagePayload) => api.post<Package>('/packages', data).then((r) => r.data),
  update: (id: string, data: PackagePayload) =>
    api.put<Package>(`/packages/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/packages/${id}`),
};
