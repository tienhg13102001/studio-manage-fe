import api from './api';
import type { Student, StudentResponse, PaginatedResponse } from '../types';

export const studentService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<StudentResponse>>('/students', { params }).then((r) => r.data),
  getOne: (id: string) => api.get<StudentResponse>(`/students/${id}`).then((r) => r.data),
  create: (data: Partial<Student>) =>
    api.post<StudentResponse>('/students', data).then((r) => r.data),
  update: (id: string, data: Partial<Student>) =>
    api.put<StudentResponse>(`/students/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/students/${id}`).then((r) => r.data),
  /** Public (no-auth) endpoint — used by the student self-entry form */
  createPublic: (data: Partial<Student>) =>
    api.post<Student>('/public/students', data).then((r) => r.data),
};
