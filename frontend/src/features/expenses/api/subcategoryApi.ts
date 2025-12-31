import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import type { Subcategory } from '../../../types/subcategory';

export const subcategoryKeys = {
  all: ['subcategories'] as const,
  byCategory: (categoryId: string) => ['subcategories', { categoryId }] as const,
};

export const useSubcategories = (categoryId?: string) => {
  return useQuery({
    queryKey: categoryId ? subcategoryKeys.byCategory(categoryId) : subcategoryKeys.all,
    queryFn: async (): Promise<Subcategory[]> => {
      const params = categoryId ? { categoryId } : undefined;
      const response = await api.get('/subcategories', { params });
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateSubcategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      categoryId: string;
      budgetAmount?: string;
      budgetPeriod?: 'monthly' | 'annual';
      budgetStartDate?: string;
      budgetEndDate?: string;
    }) => {
      const res = await api.post('/subcategories', data);
      return res.data as Subcategory;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: subcategoryKeys.all });
      qc.invalidateQueries({ queryKey: subcategoryKeys.byCategory(data.categoryId) });
    },
  });
};

export const useUpdateSubcategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        categoryId?: string;
        budgetAmount?: string | null;
        budgetPeriod?: 'monthly' | 'annual' | null;
        budgetStartDate?: string | null;
        budgetEndDate?: string | null;
      };
    }) => {
      const res = await api.patch(`/subcategories/${id}`, data);
      return res.data as Subcategory;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: subcategoryKeys.all });
      qc.invalidateQueries({ queryKey: subcategoryKeys.byCategory(data.categoryId) });
    },
  });
};

export const useDeleteSubcategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string }) => {
      await api.delete(`/subcategories/${id}`);
      return { categoryId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: subcategoryKeys.all });
      qc.invalidateQueries({ queryKey: subcategoryKeys.byCategory(data.categoryId) });
    },
  });
};

export const useSubcategoryExpenseCount = (id?: string) => {
  return useQuery({
    queryKey: ['subcategories', 'expenses-count', id],
    queryFn: async (): Promise<{ count: number }> => {
      const res = await api.get(`/subcategories/${id}/expenses-count`);
      return res.data;
    },
    enabled: !!id,
  });
};
