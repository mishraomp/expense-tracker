import type { ExpenseItem, CreateExpenseItemInput } from './expense-item.types';
import type { TagInfo } from '../../../types/tag';

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
  items?: ExpenseItem[]; // expense line items
  itemCount?: number; // count of items (for list views)
  tags?: TagInfo[]; // associated tags
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
  items?: CreateExpenseItemInput[]; // expense line items to create with the expense
  tagIds?: string[]; // tag IDs to associate with the expense
}

export interface UpdateExpenseInput {
  amount?: number;
  categoryId?: string;
  date?: string;
  description?: string;
  subcategoryId?: string | null;
  tagIds?: string[]; // tag IDs to associate with the expense
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
  itemName?: string; // Filter expenses that have items containing this name
  tagIds?: string[]; // Filter expenses that have any of these tags
}

export interface ExpenseTotals {
  total: number;
  count: number;
  budgetAmount?: number;
  budgetPeriod?: 'monthly' | 'annual';
  budgetSource?: 'subcategory' | 'category';
}
