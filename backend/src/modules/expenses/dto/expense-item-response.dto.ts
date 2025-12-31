import { ExpenseItem, Category, Subcategory } from '@prisma/client';
import { CategoryResponseDto } from './expense-response.dto';

/**
 * Response DTO for expense item data.
 * Includes nested category/subcategory when available.
 */
export class ExpenseItemResponseDto {
  id: string;
  expenseId: string;
  name: string;
  amount: number;
  categoryId: string | null;
  subcategoryId: string | null;
  notes: string | null;
  gstApplicable: boolean;
  pstApplicable: boolean;
  gstAmount: number;
  pstAmount: number;
  totalTaxAmount: number; // gstAmount + pstAmount
  totalWithTax: number; // amount + totalTaxAmount
  createdAt: Date;
  updatedAt: Date;
  category?: CategoryResponseDto;
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
  data: ExpenseItemResponseDto[];
  summary: {
    totalAmount: number;
    count: number;
  };
}
