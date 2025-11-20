import { createContext, useContext } from 'react';

interface KeycloakContextType {
  keycloak: any | null;
  initialized: boolean;
  authenticated: boolean;
}

export const KeycloakContext = createContext<KeycloakContextType>({
  keycloak: null,
  initialized: false,
  authenticated: false,
});

export const useKeycloak = () => useContext(KeycloakContext);
