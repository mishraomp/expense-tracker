import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import type { Category } from '../types/expense.types';

export const categoryKeys = { all: ['categories'] as const };

export const useCategories = () => {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async (): Promise<Category[]> => {
      const response = await api.get('/categories');
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // Categories don't change often, cache for 10 minutes
  });
};

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      colorCode?: string;
      icon?: string;
      budgetAmount?: string | number;
      budgetPeriod?: 'monthly' | 'annual';
    }) => {
      const res = await api.post('/categories', data);
      return res.data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<
        Pick<Category, 'name' | 'colorCode' | 'icon' | 'budgetAmount' | 'budgetPeriod'>
      >;
    }) => {
      const res = await api.put(`/categories/${id}`, data);
      return res.data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
};
