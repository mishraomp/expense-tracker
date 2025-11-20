import { AuthGuard, Layout } from '@/components/layout';
import NotFound from '@/components/NotFound';
import { createRootRoute, ErrorComponent, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <AuthGuard>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGuard>
  ),
  notFoundComponent: () => <NotFound />,
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
});
