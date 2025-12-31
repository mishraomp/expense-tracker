import type { Category } from './expense.types';

/**
 * Individual line item within an expense transaction.
 * Enables split receipts across different categories (e.g., Costco → Clothing → tshirt).
 */
export interface ExpenseItem {
  id: string;
  expenseId: string;
  name: string;
  amount: number;
  categoryId: string | null;
  subcategoryId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  subcategory?: { id: string; name: string };
  // Tax fields
  gstApplicable?: boolean;
  pstApplicable?: boolean;
  gstAmount?: number;
  pstAmount?: number;
  totalTaxAmount?: number;
  totalWithTax?: number;
}

/**
 * Input for creating a new expense item.
 */
export interface CreateExpenseItemInput {
  name: string;
  amount: number;
  categoryId?: string;
  subcategoryId?: string;
  notes?: string;
  // Tax fields
  gstApplicable?: boolean;
  pstApplicable?: boolean;
}

/**
 * Input for updating an existing expense item.
 * All fields are optional - only provided fields will be updated.
 */
export interface UpdateExpenseItemInput {
  name?: string;
  amount?: number;
  categoryId?: string | null;
  subcategoryId?: string | null;
  notes?: string | null;
  gstApplicable?: boolean;
  pstApplicable?: boolean;
}

/**
 * Response for expense items list operations.
 */
export interface ExpenseItemListResponse {
  data: ExpenseItem[];
  summary: {
    totalAmount: number;
    count: number;
  };
}
