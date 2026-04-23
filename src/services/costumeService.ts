import api from './api';
import type { Costume, CostumeResponse } from '../types';

export const costumeService = {
  getAll: () => api.get<CostumeResponse[]>('/costumes').then((r) => r.data),
  create: (data: Partial<Costume>) => api.post<CostumeResponse>('/costumes', data).then((r) => r.data),
  update: (id: string, data: Partial<Costume>) =>
    api.put<CostumeResponse>(`/costumes/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/costumes/${id}`),
};
