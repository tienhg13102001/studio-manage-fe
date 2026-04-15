import api from './api';
import type { Costume } from '../types';

export const costumeService = {
  getAll: () => api.get<Costume[]>('/costumes').then((r) => r.data),
  create: (data: Partial<Costume>) => api.post<Costume>('/costumes', data).then((r) => r.data),
  update: (id: string, data: Partial<Costume>) =>
    api.put<Costume>(`/costumes/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/costumes/${id}`),
};
