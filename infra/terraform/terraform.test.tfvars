# Environment: test
# Static configuration only (no secrets).

app_env             = "test"
resource_group_name = "et-test-rg"
location            = "canadacentral"

tags = {
  app     = "expense-tracker"
  app_env = "test"
}

ip_allow_list_cidrs = ["203.0.113.10/32"]

log_analytics_workspace_name = "et-test-law"

postgres_server_name      = "ettestpg000000"
postgres_app_db_name      = "expense_tracker"
postgres_keycloak_db_name = "keycloak"

vnet_name          = "et-test-vnet"
vnet_address_space = ["10.20.0.0/16"]

aca_subnet_name = "aca"
aca_subnet_cidr = "10.20.1.0/24"

postgres_subnet_name = "postgres"
postgres_subnet_cidr = "10.20.2.0/24"

container_app_environment_name = "et-test-acae"
container_app_name             = "et-test-app"

backend_image = "ghcr.io/<owner>/<repo>-backend:sha-<full_sha>"

