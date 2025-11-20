import { createFileRoute } from '@tanstack/react-router';
import { ImportPage } from '@/features/import/pages/ImportPage';

export const Route = createFileRoute('/import')({
  component: ImportPage,
});
