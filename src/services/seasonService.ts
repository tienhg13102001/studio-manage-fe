import api from './api';
import type { Season } from '../types';

export const seasonService = {
  getAll: () => api.get<Season[]>('/seasons').then((r) => r.data),
  create: (data: Omit<Season, '_id' | 'createdAt'>) =>
    api.post<Season>('/seasons', data).then((r) => r.data),
  update: (id: string, data: Omit<Season, '_id' | 'createdAt'>) =>
    api.put<Season>(`/seasons/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/seasons/${id}`).then((r) => r.data),
};
