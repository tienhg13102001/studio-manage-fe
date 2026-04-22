import api from './api';
import type { Feedback, PaginatedResponse } from '../types';

export interface FeedbackListResponse extends PaginatedResponse<Feedback> {
  totalRead: number;
  totalUnread: number;
}

export interface FeedbackSubmitPayload {
  customerId?: string;
  phone?: string;
  crewFeedback: { rating: number; description?: string };
  albumFeedback: { rating: number; description?: string };
  content?: string;
  suggestion?: string;
}

export const feedbackService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<FeedbackListResponse>('/feedbacks', { params }).then((r) => r.data),
  markRead: (id: string, isRead = true) =>
    api.patch<Feedback>(`/feedbacks/${id}/read`, { isRead }).then((r) => r.data),
  remove: (id: string) => api.delete(`/feedbacks/${id}`).then((r) => r.data),
  submit: (data: FeedbackSubmitPayload) =>
    api.post<{ _id: string }>('/public/feedback', data).then((r) => r.data),
};
