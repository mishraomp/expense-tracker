export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  budgetAmount?: string | null;
  budgetPeriod?: 'monthly' | 'annual' | null;
  budgetStartDate?: string | null;
  budgetEndDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
