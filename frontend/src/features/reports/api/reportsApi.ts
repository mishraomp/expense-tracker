import api from '@/services/api';
import type {
  SpendingOverTimeQuery,
  SpendingOverTimeResponse,
  SpendingByCategoryQuery,
  CategoryBreakdownItem,
  SpendingBySubcategoryQuery,
  SubcategoryBreakdownItem,
  BudgetVsActualQuery,
  BudgetVsActualPoint,
  CategoryBudgetReportRow,
  SubcategoryBudgetReportRow,
  BudgetReportQuery,
  IncomeVsExpenseQuery,
  IncomeVsExpenseResponse,
  TopExpenseItem,
  TopExpenseItemsQuery,
  ItemSearchQuery,
  ItemSearchResponse,
} from '../types/reports.types';

export const reportsApi = {
  getSpendingOverTime: async (query: SpendingOverTimeQuery): Promise<SpendingOverTimeResponse> => {
    const { data } = await api.get<SpendingOverTimeResponse>('/reports/spending-over-time', {
      params: query,
    });
    return data;
  },

  getSpendingByCategory: async (
    query: SpendingByCategoryQuery,
  ): Promise<CategoryBreakdownItem[]> => {
    const { data } = await api.get<CategoryBreakdownItem[]>('/reports/spending-by-category', {
      params: query,
    });
    return data;
  },

  getSpendingBySubcategory: async (
    query: SpendingBySubcategoryQuery,
  ): Promise<SubcategoryBreakdownItem[]> => {
    const { data } = await api.get<SubcategoryBreakdownItem[]>('/reports/spending-by-subcategory', {
      params: query,
    });
    return data;
  },

  getBudgetVsActual: async (query: BudgetVsActualQuery): Promise<BudgetVsActualPoint[]> => {
    const { data } = await api.get<BudgetVsActualPoint[]>('/reports/budget-vs-actual', {
      params: query,
    });
    return data;
  },

  // New: Budget reports based on DB views
  getCategoryBudgetReport: async (query: BudgetReportQuery): Promise<CategoryBudgetReportRow[]> => {
    const { data } = await api.get<any[]>('/reports/budgets/categories', { params: query });
    // Map snake_case -> camelCase and normalize dates
    return data.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      categoryType: r.category_type,
      colorCode: r.color_code ?? null,
      icon: r.icon ?? null,
      budgetAmount: r.budget_amount ?? null,
      budgetPeriod: r.budget_period ?? null,
      periodStart: r.period_start ? String(r.period_start).slice(0, 10) : null,
      periodEnd: r.period_end ? String(r.period_end).slice(0, 10) : null,
      totalSpent: r.total_spent,
      percentUsed: r.percent_used ?? null,
      remainingBudget: r.remaining_budget ?? null,
      isOverBudget: !!r.is_over_budget,
      overBudgetAmount: r.over_budget_amount ?? null,
    }));
  },

  getSubcategoryBudgetReport: async (
    query: BudgetReportQuery,
  ): Promise<SubcategoryBudgetReportRow[]> => {
    const { data } = await api.get<any[]>('/reports/budgets/subcategories', { params: query });
    return data.map((r) => ({
      subcategoryId: r.subcategory_id,
      subcategoryName: r.subcategory_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      categoryType: r.category_type,
      categoryColor: r.category_color ?? null,
      categoryIcon: r.category_icon ?? null,
      budgetAmount: r.budget_amount ?? null,
      budgetPeriod: r.budget_period ?? null,
      periodStart: r.period_start ? String(r.period_start).slice(0, 10) : null,
      periodEnd: r.period_end ? String(r.period_end).slice(0, 10) : null,
      totalSpent: r.total_spent,
      percentUsed: r.percent_used ?? null,
      remainingBudget: r.remaining_budget ?? null,
      isOverBudget: !!r.is_over_budget,
      overBudgetAmount: r.over_budget_amount ?? null,
    }));
  },

  getIncomeVsExpense: async (query: IncomeVsExpenseQuery): Promise<IncomeVsExpenseResponse> => {
    const { data } = await api.get<IncomeVsExpenseResponse>('/reports/income-vs-expense', {
      params: query,
    });
    return data;
  },

  /**
   * Get top expense items aggregated by name.
   * Returns items sorted by total amount descending.
   */
  getTopExpenseItems: async (query: TopExpenseItemsQuery): Promise<TopExpenseItem[]> => {
    const { data } = await api.get<TopExpenseItem[]>('/reports/items/top', {
      params: query,
    });
    return data;
  },

  /**
   * Search expense items by name.
   * Supports partial matching and pagination.
   */
  searchExpenseItems: async (query: ItemSearchQuery): Promise<ItemSearchResponse> => {
    const { data } = await api.get<ItemSearchResponse>('/reports/items/search', {
      params: query,
    });
    return data;
  },
};
