import { Expense, Category, Subcategory, ExpenseItem, Tag, ExpenseTag } from '@prisma/client';
import { ExpenseItemResponseDto } from './expense-item-response.dto';

export class CategoryResponseDto {
  /**
   * Category UUID.
   */
  id: string;

  /**
   * Category display name.
   */
  name: string;

  /**
   * Category type, e.g. 'predefined' (system-owned, shared) or a user-owned type.
   */
  type: string;

  /**
   * Optional display color (hex or similar), null if unset.
   */
  colorCode: string | null;

  /**
   * Optional icon identifier, null if unset.
   */
  icon: string | null;
}

export class TagResponseDto {
  /**
   * Tag UUID.
   */
  id: string;

  /**
   * Tag display name.
   */
  name: string;

  /**
   * Optional display color (hex or similar), null if unset.
   */
  colorCode: string | null;
}

export class ExpenseResponseDto {
  /**
   * Expense UUID.
   */
  id: string;

  /**
   * Owning user's ID.
   */
  userId: string;

  /**
   * Category UUID.
   */
  categoryId: string;

  /**
   * Subcategory UUID, or null/undefined if none set.
   */
  subcategoryId?: string | null;

  /**
   * Pre-tax subtotal.
   */
  amount: number;

  /**
   * Expense date, ISO 8601 (YYYY-MM-DD).
   */
  date: string;

  /**
   * Free-text note, or null if none was provided.
   */
  description: string | null;

  /**
   * Origin of this expense (e.g. 'manual', 'imported', 'api').
   */
  source: string;

  /**
   * Expense status (e.g. 'confirmed').
   */
  status: string;

  /**
   * Merchant name, or null if not set.
   */
  merchantName: string | null;

  /**
   * Whether GST applies to this expense.
   */
  gstApplicable: boolean;

  /**
   * Whether PST applies to this expense.
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
  category?: CategoryResponseDto;

  /**
   * Nested subcategory details (id/name only), when included by the query.
   */
  subcategory?: { id: string; name: string };

  /**
   * Number of active attachments, when included by the query.
   */
  attachmentCount?: number; // number of active attachments

  /**
   * Expense line items, when included by the query.
   */
  items?: ExpenseItemResponseDto[]; // expense line items

  /**
   * Count of items (used in list views instead of the full items array).
   */
  itemCount?: number; // count of items (for list views)

  /**
   * Tags associated with this expense, when included by the query.
   */
  tags?: TagResponseDto[]; // associated tags

  static fromEntity(
    expense: Expense & {
      category?: Category;
      subcategory?: Subcategory;
      attachmentCount?: number;
      itemCount?: number;
      items?: (ExpenseItem & { category?: Category | null; subcategory?: Subcategory | null })[];
      expenseTags?: (ExpenseTag & { tag: Tag })[];
    },
  ): ExpenseResponseDto {
    const gstAmount = expense.gstAmount?.toNumber() ?? 0;
    const pstAmount = expense.pstAmount?.toNumber() ?? 0;
    const totalTaxAmount = gstAmount + pstAmount;

    return {
      id: expense.id,
      userId: expense.userId,
      categoryId: expense.categoryId,
      subcategoryId: (expense as any).subcategoryId ?? null,
      amount: expense.amount.toNumber(),
      date: expense.date.toISOString().split('T')[0],
      description: expense.description,
      source: expense.source,
      status: expense.status,
      merchantName: expense.merchantName,
      gstApplicable: (expense as any).gstApplicable ?? false,
      pstApplicable: (expense as any).pstApplicable ?? false,
      gstAmount,
      pstAmount,
      totalTaxAmount,
      totalWithTax: expense.amount.toNumber() + totalTaxAmount,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      category: expense.category
        ? {
            id: expense.category.id,
            name: expense.category.name,
            type: expense.category.type,
            colorCode: expense.category.colorCode,
            icon: expense.category.icon,
          }
        : undefined,
      subcategory: expense.subcategory
        ? {
            id: expense.subcategory.id,
            name: expense.subcategory.name,
          }
        : undefined,
      attachmentCount: (expense as any).attachmentCount,
      items: expense.items?.map((item) => ExpenseItemResponseDto.fromEntity(item)),
      // Use itemCount from aggregation if provided, otherwise count from items array
      itemCount: (expense as any).itemCount ?? expense.items?.length,
      tags: expense.expenseTags?.map((et) => ({
        id: et.tag.id,
        name: et.tag.name,
        colorCode: et.tag.colorCode,
      })),
    };
  }
}

export class ExpenseListResponseDto {
  /**
   * Page of expense results.
   */
  data: ExpenseResponseDto[];

  /**
   * Pagination metadata: current page, page size (limit), total matching rows, and total pages.
   */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  /**
   * Aggregate summary across ALL matching rows (not just the current page): total amount and count.
   */
  summary: {
    totalAmount: number;
    count: number;
  };
}
