import api from './api';
import type { Student, PaginatedResponse } from '../types';

export const studentService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Student>>('/students', { params }).then((r) => r.data),
  getOne: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),
  create: (data: Partial<Student>) => api.post<Student>('/students', data).then((r) => r.data),
  update: (id: string, data: Partial<Student>) =>
    api.put<Student>(`/students/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/students/${id}`).then((r) => r.data),
};
