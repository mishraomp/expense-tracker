export interface IncomeVsExpenseQueryDto {
  startDate?: string;
  endDate?: string;
}

export interface IncomeVsExpenseResponseDto {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  incomeByMonth: MonthlyComparisonDto[];
  // breakdown of expenses per subcategory for each month
  expensesBySubcategoryByMonth?: SubcategorySpendingByMonthDto[];
}

export interface MonthlyComparisonDto {
  month: string;
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
}

export interface SubcategorySpendingByMonthDto {
  month: string; // e.g., YYYY-MM
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  colorCode?: string | null;
  amount: number; // numeric amount
}
