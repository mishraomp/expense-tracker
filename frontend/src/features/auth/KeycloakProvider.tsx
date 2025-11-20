import Keycloak from 'keycloak-js';
import { useState, useEffect, type ReactNode } from 'react';
import { KeycloakContext } from './keycloakContext';
interface KeycloakProviderProps {
  children: ReactNode;
}

export function KeycloakProvider({ children }: KeycloakProviderProps) {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
    const realm = import.meta.env.VITE_KEYCLOAK_REALM;
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;

    if (!keycloakUrl || !realm || !clientId) {
      console.error(
        'Keycloak configuration missing. Set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, and VITE_KEYCLOAK_CLIENT_ID',
      );
      setTimeout(() => setInitialized(true), 0);
      return;
    }

    const keycloakInstance = new Keycloak({ url: keycloakUrl, realm: realm, clientId: clientId });

    keycloakInstance
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256', // PKCE for public clients
        checkLoginIframe: false, // Disable iframe for simpler local dev
      })
      .then((auth) => {
        setKeycloak(keycloakInstance);
        setAuthenticated(auth);
        setInitialized(true);

        // Setup token refresh
        let refreshInterval: number | undefined = undefined;
        if (auth) {
          // Refresh token 60 seconds before expiration
          refreshInterval = window.setInterval(() => {
            keycloakInstance
              .updateToken(60)
              .then((refreshed) => {
                if (refreshed) {
                  console.log('Token refreshed');
                }
              })
              .catch(() => {
                console.error('Failed to refresh token');
                keycloakInstance.login();
              });
          }, 60000); // Check every minute
        }

        // Cleanup interval on unmount or when auth changes
        return () => {
          if (refreshInterval) clearInterval(refreshInterval);
        };
      })
      .catch((error) => {
        console.error('Keycloak initialization failed:', error);
        setTimeout(() => setInitialized(true), 0);
      });
  }, []);

  return (
    <KeycloakContext.Provider value={{ keycloak, initialized, authenticated }}>
      {children}
    </KeycloakContext.Provider>
  );
}
