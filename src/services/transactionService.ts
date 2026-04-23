import api from './api';
import type {
  Transaction,
  TransactionResponse,
  TransactionSummaryRow,
  PaginatedResponse,
} from '../types';

export const transactionService = {
  getAll: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedResponse<TransactionResponse>>('/transactions', { params })
      .then((r) => r.data),
  getOne: (id: string) => api.get<TransactionResponse>(`/transactions/${id}`).then((r) => r.data),
  create: (data: Partial<Transaction>) =>
    api.post<TransactionResponse>('/transactions', data).then((r) => r.data),
  update: (id: string, data: Partial<Transaction>) =>
    api.put<TransactionResponse>(`/transactions/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/transactions/${id}`).then((r) => r.data),
  getSummary: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<TransactionSummaryRow[]>('/transactions/summary', { params }).then((r) => r.data),
};
