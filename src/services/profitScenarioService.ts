import api from './api';
import type { ApiResponse, ProfitClassOption, ProfitScenario, ProfitScenarioInput } from '../types';

export const profitScenarioService = {
  getClasses: (season?: string) =>
    api
      .get<ApiResponse<ProfitClassOption[]>>('/profit-scenarios/classes', {
        params: season ? { season } : undefined,
      })
      .then((r) => r.data.data),
  getAll: () =>
    api.get<ApiResponse<ProfitScenario[]>>('/profit-scenarios').then((r) => r.data.data),
  create: (data: ProfitScenarioInput) =>
    api.post<ApiResponse<ProfitScenario>>('/profit-scenarios', data).then((r) => r.data.data),
  update: (id: string, data: ProfitScenarioInput) =>
    api.put<ApiResponse<ProfitScenario>>(`/profit-scenarios/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/profit-scenarios/${id}`),
};
