import { ExpenseItem, Category, Subcategory } from '@prisma/client';
import { ExpenseCategorySummaryDto } from './expense-response.dto';

/**
 * Response DTO for expense item data.
 * Includes nested category/subcategory when available.
 */
export class ExpenseItemResponseDto {
  /**
   * Expense item UUID.
   */
  id: string;

  /**
   * Parent expense UUID.
   */
  expenseId: string;

  /**
   * Item name/description.
   */
  name: string;

  /**
   * Item amount (pre-tax).
   */
  amount: number;

  /**
   * Item's category UUID, or null if unset.
   */
  categoryId: string | null;

  /**
   * Item's subcategory UUID, or null if unset.
   */
  subcategoryId: string | null;

  /**
   * Free-text note, or null if none was provided.
   */
  notes: string | null;

  /**
   * Whether GST applies to this item.
   */
  gstApplicable: boolean;

  /**
   * Whether PST applies to this item.
   */
  pstApplicable: boolean;

  /**
   * Calculated GST amount.
   */
  gstAmount: number;

  /**
   * Calculated PST amount.
   */
  pstAmount: number;

  /**
   * gstAmount + pstAmount.
   */
  totalTaxAmount: number; // gstAmount + pstAmount

  /**
   * amount + totalTaxAmount.
   */
  totalWithTax: number; // amount + totalTaxAmount

  /**
   * Record creation timestamp.
   */
  createdAt: Date;

  /**
   * Record last-updated timestamp.
   */
  updatedAt: Date;

  /**
   * Nested category details, when included by the query.
   */
  category?: ExpenseCategorySummaryDto;

  /**
   * Nested subcategory details (id/name only), when included by the query.
   */
  subcategory?: { id: string; name: string };

  /**
   * Convert Prisma ExpenseItem entity to response DTO.
   * @param item - ExpenseItem entity with optional relations
   * @returns ExpenseItemResponseDto
   */
  static fromEntity(
    item: ExpenseItem & { category?: Category | null; subcategory?: Subcategory | null },
  ): ExpenseItemResponseDto {
    const gstAmount = item.gstAmount?.toNumber() ?? 0;
    const pstAmount = item.pstAmount?.toNumber() ?? 0;
    const totalTaxAmount = gstAmount + pstAmount;

    return {
      id: item.id,
      expenseId: item.expenseId,
      name: item.name,
      amount: item.amount.toNumber(),
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      notes: item.notes,
      gstApplicable: (item as any).gstApplicable ?? false,
      pstApplicable: (item as any).pstApplicable ?? false,
      gstAmount,
      pstAmount,
      totalTaxAmount,
      totalWithTax: item.amount.toNumber() + totalTaxAmount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      category: item.category
        ? {
            id: item.category.id,
            name: item.category.name,
            type: item.category.type,
            colorCode: item.category.colorCode,
            icon: item.category.icon,
          }
        : undefined,
      subcategory: item.subcategory
        ? {
            id: item.subcategory.id,
            name: item.subcategory.name,
          }
        : undefined,
    };
  }
}

/**
 * Response DTO for expense items list operations.
 */
export class ExpenseItemListResponseDto {
  /**
   * All items for the requested expense.
   */
  data: ExpenseItemResponseDto[];

  /**
   * Aggregate summary across the returned items: total amount and count.
   */
  summary: {
    totalAmount: number;
    count: number;
  };
}
