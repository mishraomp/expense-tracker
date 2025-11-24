export interface Category {
  id: string;
  name: string;
  type: string;
  colorCode: string | null;
  icon: string | null;
  budgetAmount?: string | null;
  budgetPeriod?: 'monthly' | 'annual' | null;
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  subcategoryId?: string | null;
  amount: number;
  date: string;
  description: string | null;
  source: string;
  status: string;
  merchantName: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  subcategory?: { id: string; name: string };
  attachmentCount?: number; // number of active attachments
}

export interface ExpenseListResponse {
  data: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    count: number;
  };
}

export interface CreateExpenseInput {
  amount: number;
  categoryId: string;
  date: string;
  description?: string;
  subcategoryId?: string | null;
  recurring?: boolean;
  recurrenceFrequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly';
  numberOfRecurrences?: number;
}

export interface UpdateExpenseInput {
  amount?: number;
  categoryId?: string;
  date?: string;
  description?: string;
  subcategoryId?: string | null;
}

export interface ExpenseListQuery {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  subcategoryId?: string;
  startDate?: string;
  endDate?: string;
  // Additional date filters to be OR-ed on backend
  filterYear?: number;
  filterMonth?: number; // 1-12; ignored if year not provided
  sortOrder?: 'asc' | 'desc';
  sortBy?: string;
}

export interface ExpenseTotals {
  total: number;
  count: number;
  budgetAmount?: number;
  budgetPeriod?: 'monthly' | 'annual';
  budgetSource?: 'subcategory' | 'category';
}
