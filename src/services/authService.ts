import api from './api';
import type { User } from '../types';

interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data),
  getMe: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
  refresh: () => api.post<LoginResponse>('/auth/refresh').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string }>('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
  updateProfile: (data: { name?: string }) =>
    api.patch<User>('/auth/profile', data).then((r) => r.data),
};
