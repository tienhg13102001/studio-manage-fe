import api from './api';
import type { ApiResponse, ExternalPhotographer } from '../types';

export type ExternalPhotographerInput = Pick<ExternalPhotographer, 'name' | 'isActive'> &
  Partial<Pick<ExternalPhotographer, 'phone' | 'defaultFee' | 'notes'>>;

export const externalPhotographerService = {
  getChoices: () =>
    api
      .get<ApiResponse<ExternalPhotographer[]>>('/external-photographers/choices')
      .then((r) => r.data.data),
  getAll: () =>
    api
      .get<ApiResponse<ExternalPhotographer[]>>('/external-photographers')
      .then((r) => r.data.data),
  create: (data: ExternalPhotographerInput) =>
    api
      .post<ApiResponse<ExternalPhotographer>>('/external-photographers', data)
      .then((r) => r.data.data),
  update: (id: string, data: ExternalPhotographerInput) =>
    api
      .put<ApiResponse<ExternalPhotographer>>(`/external-photographers/${id}`, data)
      .then((r) => r.data.data),
};
