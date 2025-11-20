import api from '../../../services/api';
import type {
  CreateIncomeRequest,
  Income,
  IncomeListQuery,
  UpdateIncomeRequest,
} from '../types/income.types';

export const incomeApi = {
  getIncomes: async (query?: IncomeListQuery): Promise<Income[]> => {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.source) params.append('source', query.source);
    if (query?.frequency) params.append('frequency', query.frequency);
    if (query?.employer) params.append('employer', query.employer);

    const response = await api.get<Income[]>(`/incomes?${params.toString()}`);
    return response.data;
  },

  getIncome: async (id: string): Promise<Income> => {
    const response = await api.get<Income>(`/incomes/${id}`);
    return response.data;
  },

  createIncome: async (data: CreateIncomeRequest): Promise<Income> => {
    const response = await api.post<Income>('/incomes', data);
    return response.data;
  },

  updateIncome: async (id: string, data: UpdateIncomeRequest): Promise<Income> => {
    const response = await api.put<Income>(`/incomes/${id}`, data);
    return response.data;
  },

  deleteIncome: async (id: string): Promise<void> => {
    await api.delete(`/incomes/${id}`);
  },
};
