import { createFileRoute } from '@tanstack/react-router';
import TagsPage from '@/features/expenses/pages/TagsPage';

export const Route = createFileRoute('/tags')({
  component: TagsPage,
});
