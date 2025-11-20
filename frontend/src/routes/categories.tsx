import { createFileRoute } from '@tanstack/react-router';
import CategoriesPage from '@/features/expenses/pages/CategoriesPage';

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
});
