import { createFileRoute } from '@tanstack/react-router';
import ExpensesPage from '@/features/expenses/pages/ExpensesPage';

export const Route = createFileRoute('/')({
  component: ExpensesPage,
});
