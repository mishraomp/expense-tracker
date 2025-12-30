# Environment: prod
# Static configuration only (no secrets).

app_env             = "prod"
resource_group_name = "et-prod-rg"
location            = "canadacentral"

tags = {
  app     = "expense-tracker"
  app_env = "prod"
}

ip_allow_list_cidrs = ["203.0.113.10/32"]

log_analytics_workspace_name = "et-prod-law"
key_vault_name               = "etprodkv000000"

postgres_server_name      = "etprodpg000000"
postgres_app_db_name      = "expense_tracker"
postgres_keycloak_db_name = "keycloak"

vnet_name          = "et-prod-vnet"
vnet_address_space = ["10.30.0.0/16"]

aca_subnet_name = "aca"
aca_subnet_cidr = "10.30.1.0/24"

postgres_subnet_name = "postgres"
postgres_subnet_cidr = "10.30.2.0/24"

container_app_environment_name = "et-prod-acae"
container_app_name             = "et-prod-app"

backend_image = "ghcr.io/<owner>/<repo>-backend:sha-<full_sha>"

key_vault_secret_ids = {
  database_url            = "https://<kv>.vault.azure.net/secrets/database-url"
  keycloak_db_url         = "https://<kv>.vault.azure.net/secrets/keycloak-db-url"
  keycloak_admin_password = "https://<kv>.vault.azure.net/secrets/keycloak-admin-password"
  postgres_admin_password = "https://<kv>.vault.azure.net/secrets/postgres-admin-password"
}
