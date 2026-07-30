import { apiRequest, ApiError } from './apiClient.js';

export interface Category {
  id: string;
  name: string;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

// Categories rarely change mid-session; cache for the life of this process
// instead of refetching on every tool call.
let categoryCache: Category[] | null = null;

async function getCategories(): Promise<Category[]> {
  if (!categoryCache) {
    categoryCache = await apiRequest<Category[]>('/categories');
  }
  return categoryCache;
}

export function invalidateCategoryCache(): void {
  categoryCache = null;
}

export async function listCategories(): Promise<Category[]> {
  return getCategories();
}

export async function resolveCategoryId(name: string): Promise<string> {
  const categories = await getCategories();
  const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (!match) {
    const available = categories.map((c) => c.name).join(', ') || '(none yet)';
    throw new ApiError(`No category named '${name}'. Available categories: ${available}`);
  }
  return match.id;
}

export async function resolveSubcategoryId(categoryId: string, name: string): Promise<string> {
  const subcategories = await apiRequest<Subcategory[]>('/subcategories', {
    query: { categoryId },
  });
  const match = subcategories.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (!match) {
    const available = subcategories.map((s) => s.name).join(', ') || '(none yet)';
    throw new ApiError(`No subcategory named '${name}' under that category. Available: ${available}`);
  }
  return match.id;
}
