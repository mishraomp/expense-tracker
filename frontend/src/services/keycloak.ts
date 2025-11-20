import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'expense-tracker',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'expense-tracker-web',
};

const _kc = new Keycloak(keycloakConfig);

export default _kc;
