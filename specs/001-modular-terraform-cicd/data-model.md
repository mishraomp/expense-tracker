# Phase 1 Data Model: Modular IaC & CI/CD

This feature is infrastructure- and pipeline-centric; the “data model” here describes the core *configuration entities* and their relationships.

## Entities

### Environment
Represents a deployment/isolation boundary.

- **Fields**
  - `app_env`: string (e.g., `dev`, `test`, `prod`)
  - `subscription_id`: string (single subscription, multiple environments)
  - `location`: string (Azure region; default `canadacentral`)
  - `naming_prefix`: string
  - `tags`: map(string)
- **Relationships**
  - 1 Environment → 1 Terraform state namespace (key prefix)
  - 1 Environment → 1 VNet
  - 1 Environment → 1 Log Analytics workspace

### Terraform Root
A root module that is applied independently.

- **Fields**
  - `name`: string (e.g., `infra/terraform`)
  - `backend`: Azure Storage backend configuration (state container + key)
  - `inputs`: strongly-typed variables
  - `outputs`: resource IDs required by workflows
- **Relationships**
  - 1 Terraform Root → many Azure resources

### Terraform Module
Reusable IaC component.

- **Fields**
  - `name`: string (e.g., `modules/network`)
  - `inputs`: object
  - `outputs`: object
- **Relationships**
  - Terraform Root → calls many Modules

### GitHub Workflow
Automation definition.

- **Fields**
  - `name`: string (e.g., `ci`, `terraform-plan`, `deploy`)
  - `trigger`: event(s) (`pull_request`, `push`, `workflow_dispatch`)
  - `permissions`: minimal required permissions
  - `required_secrets`: list(string)
  - `artifacts`: list(string)
- **Relationships**
  - PR workflow → enforces Constitution gates
  - Deploy workflow → targets exactly one Environment via `app_env`

### Secret Store
Represents where runtime secrets live.

- **Fields**
  - `provider`: `azure_key_vault`
  - `key_vault_name`: string
- **Relationships**
  - GitHub Actions stores only Key Vault reference(s) (no long-lived app secrets)
  - Container Apps runtime reads secrets from Key Vault

### Postgres Databases
Logical databases on a single Postgres server instance.

- **Fields**
  - `app_database`: `expense_tracker`
  - `keycloak_database`: `keycloak`
- **Relationships**
  - App + Keycloak share one server, separate databases

### Bootstrap Script Config
One-time setup inputs for provisioning GitHub Actions OIDC + Terraform state.

- **Fields**
  - `identity_name`: string
  - `identity_resource_group`: string
  - `tfstate_resource_group`: string
  - `tfstate_storage_account`: string
  - `tfstate_container`: string

### Container Image
Build output stored in GHCR.

- **Fields**
  - `registry`: `ghcr.io`
  - `repository`: `<owner>/expense-tracker`
  - `tag`: commit SHA (preferred)
- **Relationships**
  - CI/CD produces images
  - Terraform deploy consumes image references

### IP Allow List
A set of IPv4 CIDR blocks to restrict ingress.

- **Fields**
  - `cidrs`: list(string)
- **Relationships**
  - GitHub Actions secret/variable → Terraform input → Container App ingress ipSecurityRestrictions

## Derived Model Constraints

- A Container Apps environment subnet is effectively immutable for sizing once created.
- Postgres VNet-integration subnet must be delegated to `Microsoft.DBforPostgreSQL/flexibleServers` and contain only that resource type.
- Container Apps IP restriction rules must all be either Allow or Deny and are IPv4 CIDR only.
