import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import type {
  CreateExpenseInput,
  Expense,
  ExpenseListQuery,
  ExpenseListResponse,
  ExpenseTotals,
  UpdateExpenseInput,
} from '../types/expense.types';

// Query Keys
export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: ExpenseListQuery) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
  totals: (filters: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>) =>
    [...expenseKeys.all, 'totals', filters] as const,
};

// Fetch Expenses List
export const useExpenses = (query: ExpenseListQuery = {}) => {
  return useQuery({
    queryKey: expenseKeys.list(query),
    queryFn: async (): Promise<ExpenseListResponse> => {
      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.pageSize) params.append('pageSize', query.pageSize.toString());
      if (query.categoryId) params.append('categoryId', query.categoryId);
      if (query.subcategoryId) params.append('subcategoryId', query.subcategoryId);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      // Handle array sortOrder - join as comma-separated string
      if (query.sortOrder && query.sortOrder.length > 0) {
        params.append('sortOrder', query.sortOrder.join(','));
      }
      // Handle array sortBy - join as comma-separated string
      if (query.sortBy && query.sortBy.length > 0) {
        params.append('sortBy', query.sortBy.join(','));
      }
      if (query.filterYear !== undefined) params.append('filterYear', String(query.filterYear));
      if (query.filterMonth !== undefined) params.append('filterMonth', String(query.filterMonth));
      if (query.itemName) params.append('itemName', query.itemName);
      if (query.tagIds && query.tagIds.length > 0) {
        params.append('tagIds', query.tagIds.join(','));
      }

      const response = await api.get(`/expenses?${params.toString()}`);
      return response.data;
    },
  });
};

// Fetch Single Expense
export const useExpense = (id: string) => {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: async (): Promise<Expense> => {
      const response = await api.get(`/expenses/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Fetch Expense Totals
export const useExpenseTotals = (
  filters: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'> = {},
) => {
  return useQuery({
    queryKey: expenseKeys.totals(filters),
    queryFn: async (): Promise<ExpenseTotals> => {
      const params = new URLSearchParams();
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.filterYear !== undefined) params.append('filterYear', String(filters.filterYear));
      if (filters.filterMonth !== undefined)
        params.append('filterMonth', String(filters.filterMonth));

      const response = await api.get(`/expenses/totals?${params.toString()}`);
      return response.data;
    },
  });
};

// Create Expense
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseInput): Promise<Expense> => {
      const response = await api.post('/expenses', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all expense queries to refetch
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create expense';
      toast.error(message);
    },
  });
};

// Update Expense
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateExpenseInput;
    }): Promise<Expense> => {
      const response = await api.put(`/expenses/${id}`, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: expenseKeys.detail(id) });

      // Snapshot previous value
      const previousExpense = queryClient.getQueryData(expenseKeys.detail(id));

      // Optimistically update
      if (previousExpense) {
        queryClient.setQueryData(expenseKeys.detail(id), (old: Expense) => ({ ...old, ...data }));
      }

      return { previousExpense };
    },
    onSuccess: () => {
      // Invalidate all expense queries
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense updated successfully');
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousExpense) {
        queryClient.setQueryData(expenseKeys.detail(_variables.id), context.previousExpense);
      }
      const message = error.response?.data?.message || 'Failed to update expense';
      toast.error(message);
    },
  });
};

// Delete Expense
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      // Invalidate all expense queries
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete expense';
      toast.error(message);
    },
  });
};
