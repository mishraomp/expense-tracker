# Environment: dev
# Static configuration only (no secrets).

app_env             = "dev"
resource_group_name = "et-dev-rg"
location            = "canadacentral"

tags = {
  app     = "expense-tracker"
  app_env = "dev"
}


log_analytics_workspace_name = "et-dev-law"


# Postgres server name must be globally unique.
postgres_server_name      = "etdevpg000000"
postgres_app_db_name      = "expense_tracker"
postgres_keycloak_db_name = "keycloak"

vnet_name          = "et-dev-vnet"
vnet_address_space = ["10.10.0.0/16"]

aca_subnet_name = "aca"
aca_subnet_cidr = "10.10.1.0/24"

postgres_subnet_name = "postgres"
postgres_subnet_cidr = "10.10.2.0/24"

container_app_environment_name = "et-dev-acae"
container_app_name             = "et-dev-app"

# Images are expected to come from CI-published tags.
backend_image = "ghcr.io/<owner>/<repo>-backend:sha-<full_sha>"

# Key Vault secret IDs are NOT secret values. Prefer versionless IDs so rotations don't require terraform changes.
key_vault_secret_ids = {
  database_url            = "https://<kv>.vault.azure.net/secrets/database-url"
  keycloak_db_url         = "https://<kv>.vault.azure.net/secrets/keycloak-db-url"
  keycloak_admin_password = "https://<kv>.vault.azure.net/secrets/keycloak-admin-password"
  postgres_admin_password = "https://<kv>.vault.azure.net/secrets/postgres-admin-password"
}

# Postgres admin credentials MUST NOT be committed to tfvars.
# Pass them via CI secrets as TF_VAR_postgres_admin_username / TF_VAR_postgres_admin_password.
