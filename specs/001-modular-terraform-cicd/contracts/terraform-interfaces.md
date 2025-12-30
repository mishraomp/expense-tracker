# Contract: Terraform Interfaces

This contract defines the intended root variables and module boundaries.

## Root module structure

- **Structure**: a single Terraform root module at `infra/terraform/`.
- **Environment config**: provided by static `terraform.<env>.tfvars` files (e.g., `terraform.dev.tfvars`).
- **Secrets**: are never stored in tfvars; runtime secrets are always read from Azure Key Vault.

## Root variables (per environment)

- `app_env` (string): `dev|test|prod`
- `resource_group_name` (string): Azure Resource Group used for all resources in the environment
- `location` (string): Azure region
- `tags` (map(string))
- `ip_allow_list_cidrs` (list(string)): IPv4 CIDR blocks used for Container Apps ingress allow rules
- `key_vault_name` (string): Key Vault name for environment secrets (system of record)
- `key_vault_secret_ids` (map(string)): Key Vault secret IDs used by Container Apps (IDs may be versioned or versionless; prefer versionless for rotation)
- `log_analytics_workspace_name` (string)
- `postgres_server_name` (string)
- `postgres_app_db_name` (string): default `expense_tracker`
- `postgres_keycloak_db_name` (string): default `keycloak`
- `postgres_admin_username` (string, sensitive): passed via pipeline (do not commit to `terraform.<env>.tfvars`)
- `postgres_admin_password` (string, sensitive): passed via pipeline (do not commit to `terraform.<env>.tfvars`)

Networking:
- `vnet_name` (string)
- `vnet_address_space` (list(string))
- `aca_subnet_name` (string)
- `aca_subnet_cidr` (string)
- `postgres_subnet_name` (string)
- `postgres_subnet_cidr` (string)

Container Apps:
- `container_app_environment_name` (string)
- `container_app_name` (string)
- `backend_image` (string)
- `keycloak_image` (string)
- `flyway_image` (string)
- `keycloak_admin_username` (string)

## Module boundaries (planned)

### `modules/network`
- **Responsibilities**: VNet, subnets, NSGs, subnet delegations
- **Key outputs**:
  - `aca_subnet_id`
  - `postgres_subnet_id`
  - `vnet_id`

### `modules/observability`
- **Responsibilities**: Log Analytics workspace
- **Key outputs**:
  - `log_analytics_workspace_id`
  - `log_analytics_workspace_resource_id`

### `modules/postgres`
- **Responsibilities**: PostgreSQL Flexible Server in delegated subnet + private DNS wiring + diagnostics
- **Inputs**:
  - `delegated_subnet_id`
  - `vnet_id` (for private DNS zone link)
  - `log_analytics_workspace_resource_id`
  - `databases` (list(string)): create databases (at minimum app + keycloak)

### `modules/container-apps`
- **Responsibilities**: Container Apps environment + Container App definition (main + Keycloak sidecar + Flyway init) + ingress restrictions + diagnostics
- **Inputs**:
  - `aca_subnet_id`
  - `log_analytics_workspace_*`
  - `ip_allow_list_cidrs`
  - `key_vault_id` + `key_vault_secret_ids` (so the app can reference Key Vault secrets)

## Notes / Caveats

- Container Apps subnet sizing/delegation and Postgres subnet delegation are effectively immutable choices; plan subnet sizes up-front.
- IP restrictions require homogeneous rule action (all Allow or all Deny) and IPv4 CIDR only.
