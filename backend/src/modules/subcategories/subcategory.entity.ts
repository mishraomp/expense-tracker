/**
 * Core Subcategory entity (matches DB schema after V3.2.0 migration)
 * Budget fields are now stored in separate `budgets` table
 */
export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}
