import api from './api';

export interface TelegramStatus {
  linked: boolean;
  telegramUsername: string | null;
}

export interface TelegramLinkResponse {
  token: string;
  url: string;
  expiresAt: string;
}

export const telegramService = {
  getStatus: () => api.get<TelegramStatus>('/telegram/status').then((r) => r.data),
  generateLinkToken: () =>
    api.post<TelegramLinkResponse>('/telegram/generate-link-token').then((r) => r.data),
  unlink: () => api.delete('/telegram/unlink').then((r) => r.data),
};
