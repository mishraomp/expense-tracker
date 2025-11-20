import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

// Import bootstrap styles
import '@/scss/styles.scss';

// Import the generated route tree
import { routeTree } from './routeTree.gen';
import { useAuthStore } from './stores';
import { queryClient } from './services/queryClient';

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
};

// Initialize authentication
const authStore = useAuthStore.getState();
authStore.initKeycloak().then(() => {
  renderApp();
});
