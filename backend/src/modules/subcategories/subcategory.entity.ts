import { Prisma } from '@prisma/client';

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  budgetAmount?: Prisma.Decimal | null;
  budgetPeriod?: 'monthly' | 'annual' | null;
  createdAt: Date;
  updatedAt: Date;
}
