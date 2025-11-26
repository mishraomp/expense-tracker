export interface SpendingOverTimePoint {
  bucket: string; // YYYY-MM-DD
  amount: string; // decimal string
}

export interface SpendingOverTimeResponse {
  data: SpendingOverTimePoint[];
  meta: { interval: 'day' | 'week' | 'month' };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  colorCode: string | null;
  amount: string; // decimal string
}

export interface SubcategoryBreakdownItem {
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  colorCode: string | null;
  amount: string; // decimal string
}

export interface BudgetVsActualPoint {
  bucket: string; // YYYY-MM-DD, first of month
  budgetAmount: string; // decimal string
  actualAmount: string; // decimal string
}

export interface SpendingOverTimeQuery {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  interval: 'day' | 'week' | 'month';
  categoryId?: string;
  subcategoryId?: string;
}

export interface SpendingByCategoryQuery {
  startDate: string;
  endDate: string;
  categoryId?: string;
  subcategoryId?: string;
}

export interface SpendingBySubcategoryQuery {
  startDate: string;
  endDate: string;
  categoryId?: string;
  subcategoryId?: string;
}

export interface BudgetVsActualQuery {
  startDate: string;
  endDate: string;
  categoryId?: string;
  subcategoryId?: string;
}

// New: Budget Report types (views)
export interface CategoryBudgetReportRow {
  categoryId: string;
  categoryName: string;
  categoryType: 'predefined' | 'custom';
  colorCode: string | null;
  icon: string | null;
  budgetAmount: string | null;
  budgetPeriod: 'monthly' | 'annual' | null;
  periodStart: string | null; // ISO date
  periodEnd: string | null; // ISO date
  totalSpent: string; // decimal string
  percentUsed: string | null; // decimal string
  remainingBudget: string | null; // decimal string
  isOverBudget: boolean;
  overBudgetAmount: string | null;
}

export interface SubcategoryBudgetReportRow {
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  categoryType: 'predefined' | 'custom';
  categoryColor: string | null;
  categoryIcon: string | null;
  budgetAmount: string | null;
  budgetPeriod: 'monthly' | 'annual' | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalSpent: string;
  percentUsed: string | null;
  remainingBudget: string | null;
  isOverBudget: boolean;
  overBudgetAmount: string | null;
}

export interface BudgetReportQuery {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  subcategoryId?: string;
}

export interface IncomeVsExpenseQuery {
  startDate?: string;
  endDate?: string;
}

export interface MonthlyComparison {
  month: string;
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
}

export interface IncomeVsExpenseResponse {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  incomeByMonth: MonthlyComparison[];
  expensesBySubcategoryByMonth?: SubcategorySpendingByMonth[];
}

export interface SubcategorySpendingByMonth {
  month: string; // YYYY-MM
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  colorCode?: string | null;
  amount: number;
}

export type ReportType =
  | 'spending-over-time'
  | 'spending-by-category'
  | 'spending-by-subcategory'
  | 'budget-vs-actual'
  | 'income-vs-expense';

// Item-level report types
export interface TopExpenseItem {
  name: string;
  totalAmount: string;
  itemCount: number;
  expenseCount: number;
  categoryId: string | null;
  categoryName: string | null;
  colorCode: string | null;
}

export interface TopExpenseItemsQuery {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  limit?: number;
}

export interface ItemSearchResult {
  id: string;
  name: string;
  amount: string;
  expenseId: string;
  expenseDate: string;
  expenseDescription: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  notes: string | null;
}

export interface ItemSearchQuery {
  q: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface ItemSearchResponse {
  data: ItemSearchResult[];
  total: number;
}

// Subcategory line items types
export interface SubcategoryLineItem {
  id: string;
  name: string;
  amount: string;
  expenseId: string;
  expenseDate: string;
  expenseDescription: string | null;
  source: 'item';
}

export interface SubcategoryLineItemsQuery {
  subcategoryId: string;
  startDate: string;
  endDate: string;
}

export interface SubcategoryLineItemsResponse {
  items: SubcategoryLineItem[];
  total: string;
}
