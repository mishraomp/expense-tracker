import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reportsApi';
import type {
  SpendingOverTimeQuery,
  SpendingByCategoryQuery,
  SpendingBySubcategoryQuery,
  BudgetVsActualQuery,
  BudgetReportQuery,
  IncomeVsExpenseQuery,
} from '../types/reports.types';

export const useSpendingOverTime = (query: SpendingOverTimeQuery) => {
  return useQuery({
    queryKey: ['reports', 'spending-over-time', query],
    queryFn: () => reportsApi.getSpendingOverTime(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!query.startDate && !!query.endDate && !!query.interval,
  });
};

export const useSpendingByCategory = (query: SpendingByCategoryQuery) => {
  return useQuery({
    queryKey: ['reports', 'spending-by-category', query],
    queryFn: () => reportsApi.getSpendingByCategory(query),
    staleTime: 5 * 60 * 1000,
    enabled: !!query.startDate && !!query.endDate,
  });
};

export const useSpendingBySubcategory = (query: SpendingBySubcategoryQuery) => {
  return useQuery({
    queryKey: ['reports', 'spending-by-subcategory', query],
    queryFn: () => reportsApi.getSpendingBySubcategory(query),
    staleTime: 5 * 60 * 1000,
    enabled: !!query.startDate && !!query.endDate,
  });
};

export const useBudgetVsActual = (query: BudgetVsActualQuery) => {
  return useQuery({
    queryKey: ['reports', 'budget-vs-actual', query],
    queryFn: () => reportsApi.getBudgetVsActual(query),
    staleTime: 5 * 60 * 1000,
    enabled: !!query.startDate && !!query.endDate,
  });
};

export const useCategoryBudgetReport = (query: BudgetReportQuery) => {
  return useQuery({
    queryKey: ['reports', 'budget-report', 'categories', query],
    queryFn: () => reportsApi.getCategoryBudgetReport(query),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSubcategoryBudgetReport = (query: BudgetReportQuery) => {
  return useQuery({
    queryKey: ['reports', 'budget-report', 'subcategories', query],
    queryFn: () => reportsApi.getSubcategoryBudgetReport(query),
    staleTime: 5 * 60 * 1000,
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
// No-op, ensure file saved
