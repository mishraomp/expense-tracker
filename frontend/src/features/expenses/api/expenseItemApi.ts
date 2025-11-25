import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import type {
  CreateExpenseItemInput,
  ExpenseItem,
  ExpenseItemListResponse,
  UpdateExpenseItemInput,
} from '../types/expense-item.types';
import { expenseKeys } from './expenseApi';

/**
 * Query keys for expense items.
 * Items are nested under their parent expense.
 */
export const expenseItemKeys = {
  all: (expenseId: string) => [...expenseKeys.detail(expenseId), 'items'] as const,
  list: (expenseId: string) => [...expenseItemKeys.all(expenseId), 'list'] as const,
  detail: (expenseId: string, itemId: string) =>
    [...expenseItemKeys.all(expenseId), 'detail', itemId] as const,
};

/**
 * Fetch all items for an expense.
 * @param expenseId - Parent expense ID
 */
export const useExpenseItems = (expenseId: string) => {
  return useQuery({
    queryKey: expenseItemKeys.list(expenseId),
    queryFn: async (): Promise<ExpenseItemListResponse> => {
      const response = await api.get(`/expenses/${expenseId}/items`);
      return response.data;
    },
    enabled: !!expenseId,
  });
};

/**
 * Fetch a single expense item.
 * @param expenseId - Parent expense ID
 * @param itemId - Item ID
 */
export const useExpenseItem = (expenseId: string, itemId: string) => {
  return useQuery({
    queryKey: expenseItemKeys.detail(expenseId, itemId),
    queryFn: async (): Promise<ExpenseItem> => {
      const response = await api.get(`/expenses/${expenseId}/items/${itemId}`);
      return response.data;
    },
    enabled: !!expenseId && !!itemId,
  });
};

/**
 * Create a new expense item.
 */
export const useCreateExpenseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      data,
    }: {
      expenseId: string;
      data: CreateExpenseItemInput;
    }): Promise<ExpenseItem> => {
      const response = await api.post(`/expenses/${expenseId}/items`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate items list and parent expense detail
      queryClient.invalidateQueries({
        queryKey: expenseItemKeys.all(variables.expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(variables.expenseId),
      });
      toast.success('Item added successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add item';
      toast.error(message);
    },
  });
};

/**
 * Create multiple expense items at once.
 */
export const useBulkCreateExpenseItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      items,
    }: {
      expenseId: string;
      items: CreateExpenseItemInput[];
    }): Promise<ExpenseItem[]> => {
      const response = await api.post(`/expenses/${expenseId}/items/bulk`, items);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate items list and parent expense detail
      queryClient.invalidateQueries({
        queryKey: expenseItemKeys.all(variables.expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(variables.expenseId),
      });
      toast.success('Items added successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add items';
      toast.error(message);
    },
  });
};

/**
 * Update an expense item.
 */
export const useUpdateExpenseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      itemId,
      data,
    }: {
      expenseId: string;
      itemId: string;
      data: UpdateExpenseItemInput;
    }): Promise<ExpenseItem> => {
      const response = await api.put(`/expenses/${expenseId}/items/${itemId}`, data);
      return response.data;
    },
    onMutate: async ({ expenseId, itemId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: expenseItemKeys.detail(expenseId, itemId),
      });

      // Snapshot previous value
      const previousItem = queryClient.getQueryData(expenseItemKeys.detail(expenseId, itemId));

      // Optimistically update
      if (previousItem) {
        queryClient.setQueryData(expenseItemKeys.detail(expenseId, itemId), (old: ExpenseItem) => ({
          ...old,
          ...data,
        }));
      }

      return { previousItem };
    },
    onSuccess: (_data, variables) => {
      // Invalidate items list and parent expense detail
      queryClient.invalidateQueries({
        queryKey: expenseItemKeys.all(variables.expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(variables.expenseId),
      });
      toast.success('Item updated successfully');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousItem) {
        queryClient.setQueryData(
          expenseItemKeys.detail(variables.expenseId, variables.itemId),
          context.previousItem,
        );
      }
      const message = error.response?.data?.message || 'Failed to update item';
      toast.error(message);
    },
  });
};

/**
 * Delete an expense item.
 */
export const useDeleteExpenseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      itemId,
    }: {
      expenseId: string;
      itemId: string;
    }): Promise<void> => {
      await api.delete(`/expenses/${expenseId}/items/${itemId}`);
    },
    onSuccess: (_data, variables) => {
      // Invalidate items list and parent expense detail
      queryClient.invalidateQueries({
        queryKey: expenseItemKeys.all(variables.expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(variables.expenseId),
      });
      toast.success('Item deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete item';
      toast.error(message);
    },
  });
};

/**
 * Delete all items for an expense.
 */
export const useDeleteAllExpenseItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string): Promise<void> => {
      await api.delete(`/expenses/${expenseId}/items`);
    },
    onSuccess: (_data, expenseId) => {
      // Invalidate items list and parent expense detail
      queryClient.invalidateQueries({
        queryKey: expenseItemKeys.all(expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(expenseId),
      });
      toast.success('All items deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete items';
      toast.error(message);
    },
  });
};
