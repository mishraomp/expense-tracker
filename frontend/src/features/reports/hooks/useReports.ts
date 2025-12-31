import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reportsApi';
import type {
  SpendingOverTimeQuery,
  SpendingByCategoryQuery,
  SpendingByCategoryTagsQuery,
  SpendingBySubcategoryQuery,
  BudgetVsActualQuery,
  BudgetReportQuery,
  IncomeVsExpenseQuery,
  TopExpenseItemsQuery,
  ItemSearchQuery,
  SubcategoryLineItemsQuery,
} from '../types/reports.types';

export const useSpendingOverTime = (query: SpendingOverTimeQuery & { enabled?: boolean }) => {
  const { enabled = true, ...apiQuery } = query;
  return useQuery({
    queryKey: ['reports', 'spending-over-time', apiQuery],
    queryFn: () => reportsApi.getSpendingOverTime(apiQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!apiQuery.startDate && !!apiQuery.endDate && !!apiQuery.interval,
  });
};

export const useSpendingByCategory = (query: SpendingByCategoryQuery & { enabled?: boolean }) => {
  const { enabled = true, ...apiQuery } = query;
  return useQuery({
    queryKey: ['reports', 'spending-by-category', apiQuery],
    queryFn: () => reportsApi.getSpendingByCategory(apiQuery),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!apiQuery.startDate && !!apiQuery.endDate,
  });
};

export const useSpendingByCategoryTags = (
  query: SpendingByCategoryTagsQuery & { enabled?: boolean },
) => {
  const { enabled = true, ...apiQuery } = query;
  const hasFilter = !!apiQuery.categoryId || (apiQuery.tagIds?.length ?? 0) > 0;
  return useQuery({
    queryKey: ['reports', 'spending-by-category-tags', apiQuery],
    queryFn: () => reportsApi.getSpendingByCategoryTags(apiQuery),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!apiQuery.startDate && !!apiQuery.endDate && hasFilter,
  });
};

export const useSpendingBySubcategory = (
  query: SpendingBySubcategoryQuery & { enabled?: boolean },
) => {
  const { enabled = true, ...apiQuery } = query;
  return useQuery({
    queryKey: ['reports', 'spending-by-subcategory', apiQuery],
    queryFn: () => reportsApi.getSpendingBySubcategory(apiQuery),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!apiQuery.startDate && !!apiQuery.endDate,
  });
};

export const useBudgetVsActual = (query: BudgetVsActualQuery) => {
  return useQuery({
    queryKey: ['reports', 'budget-vs-actual', query],
    queryFn: () => reportsApi.getBudgetVsActual(query),
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });
};

export const useCategoryBudgetReport = (query: BudgetReportQuery & { enabled?: boolean }) => {
  const { enabled = true, ...apiQuery } = query;
  return useQuery({
    queryKey: ['reports', 'budget-report', 'categories', apiQuery],
    queryFn: () => reportsApi.getCategoryBudgetReport(apiQuery),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
};

export const useSubcategoryBudgetReport = (query: BudgetReportQuery & { enabled?: boolean }) => {
  const { enabled = true, ...apiQuery } = query;
  return useQuery({
    queryKey: ['reports', 'budget-report', 'subcategories', apiQuery],
    queryFn: () => reportsApi.getSubcategoryBudgetReport(apiQuery),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
};

export const useIncomeVsExpense = (query: IncomeVsExpenseQuery) => {
  return useQuery({
    queryKey: ['reports', 'income-vs-expense', query],
    queryFn: () => reportsApi.getIncomeVsExpense(query),
    staleTime: 5 * 60 * 1000,
    enabled: !!query.startDate && !!query.endDate,
  });
};

/**
 * Hook to fetch total budget for a date range.
 */
export const useTotalBudget = (query: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['reports', 'budgets', 'total', query],
    queryFn: () => reportsApi.getTotalBudget(query),
    staleTime: 5 * 60 * 1000,
    enabled: !!query.startDate && !!query.endDate,
  });
};

/**
 * Hook to fetch top expense items aggregated by name.
 */
export const useTopExpenseItems = (query: TopExpenseItemsQuery) => {
  return useQuery({
    queryKey: ['reports', 'items', 'top', query],
    queryFn: () => reportsApi.getTopExpenseItems(query),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to search expense items by name.
 */
export const useSearchExpenseItems = (query: ItemSearchQuery) => {
  return useQuery({
    queryKey: ['reports', 'items', 'search', query],
    queryFn: () => reportsApi.searchExpenseItems(query),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    enabled: !!query.q && query.q.length >= 2, // Only search with at least 2 characters
  });
};

/**
 * Hook to fetch line items for a specific subcategory within date range.
 */
export const useSubcategoryLineItems = (query: SubcategoryLineItemsQuery) => {
  return useQuery({
    queryKey: ['reports', 'subcategory', query.subcategoryId, 'items', query],
    queryFn: () => reportsApi.getSubcategoryLineItems(query),
    staleTime: 5 * 60 * 1000,
    enabled: !!query.subcategoryId && !!query.startDate && !!query.endDate,
  });
};
// No-op, ensure file saved
