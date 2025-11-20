import { type ReactNode, useEffect } from 'react';
import { useKeycloak } from './keycloakContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { keycloak, initialized, authenticated } = useKeycloak();

  // Only trigger login as a side-effect (not during render) to avoid render loops
  useEffect(() => {
    if (initialized && !authenticated) {
      // If a Keycloak instance exists, trigger login once
      keycloak?.login();
    }
  }, [initialized, authenticated, keycloak]);

  if (!initialized) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
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

  return <>{children}</>;
}
