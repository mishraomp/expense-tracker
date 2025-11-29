import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incomeApi } from '../api/incomeApi';
import type {
  CreateIncomeRequest,
  IncomeListQuery,
  UpdateIncomeRequest,
} from '../types/income.types';

export const useIncomes = (query?: IncomeListQuery) => {
  return useQuery({
    queryKey: ['incomes', query],
    queryFn: () => incomeApi.getIncomes(query),
    staleTime: 5 * 60 * 1000, // 5 minutes - consistent with other query hooks
  });
};

export const useIncome = (id: string) => {
  return useQuery({
    queryKey: ['incomes', id],
    queryFn: () => incomeApi.getIncome(id),
    enabled: !!id,
  });
};

export const useCreateIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIncomeRequest) => incomeApi.createIncome(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
};

export const useUpdateIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIncomeRequest }) =>
      incomeApi.updateIncome(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
};

export const useDeleteIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => incomeApi.deleteIncome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
};
