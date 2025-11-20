export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  budgetAmount?: string | null;
  budgetPeriod?: 'monthly' | 'annual' | null;
  createdAt: Date;
  updatedAt: Date;
}
