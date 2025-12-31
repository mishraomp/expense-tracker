import { Expense, Category, Subcategory, ExpenseItem, Tag, ExpenseTag } from '@prisma/client';
import { ExpenseItemResponseDto } from './expense-item-response.dto';

export class CategoryResponseDto {
  id: string;
  name: string;
  type: string;
  colorCode: string | null;
  icon: string | null;
}

export class TagResponseDto {
  id: string;
  name: string;
  colorCode: string | null;
}

export class ExpenseResponseDto {
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
  attachmentCount?: number; // number of active attachments
  items?: ExpenseItemResponseDto[]; // expense line items
  itemCount?: number; // count of items (for list views)
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
  data: ExpenseResponseDto[];
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
