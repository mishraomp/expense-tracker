import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth';

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { isInitialized, isAuthenticated, isLoading, hasRole, login } = useAuthStore();

  useEffect(() => {
    // If not authenticated and initialization is complete, trigger login
    if (isInitialized && !isAuthenticated && !isLoading) {
      login();
    }
  }, [isInitialized, isAuthenticated, isLoading, login]);

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Initializing...</span>
        </div>
      </div>
    );
  }

  // Show loading if not authenticated (will trigger login)
  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Redirecting to login...</span>
          </div>
          <p className="text-muted">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check role-based access if roles are specified
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = hasRole(requiredRoles);

    if (!hasRequiredRole) {
      return (
        <div className="container mt-5">
          <div className="alert alert-warning" role="alert">
            <h4 className="alert-heading">Access Denied</h4>
            <p>You don't have the required permissions to access this page.</p>
            <hr />
            <p className="mb-0">Required roles: {requiredRoles.join(', ')}</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
