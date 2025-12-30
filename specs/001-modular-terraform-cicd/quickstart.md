# Quickstart: Modular IaC & CI/CD

This quickstart covers how to run the checks locally that CI will enforce, and how the workflows are intended to be used.

## Local CI-equivalent checks

### Backend
From repo root:

- Install deps: `cd backend; npm ci`
- Lint: `cd backend; npm run lint`
- Unit tests + coverage: `cd backend; npm run test:cov`

CI coverage gates (from Constitution): backend lines ≥ 85%, branches ≥ 75%.

### Frontend
From repo root:

- Install deps: `cd frontend; npm ci`
- Lint: `cd frontend; npm run lint`
- Unit tests + coverage: `cd frontend; npm run test:cov`

CI coverage gates (from Constitution): frontend critical-logic lines ≥ 80%.

### E2E (Playwright)
E2E is required when user journeys are impacted.

- Start stack (includes Postgres, Keycloak, API, frontend): `docker compose up -d --build`
- Install deps: `cd frontend; npm ci`
- Install browsers: `cd frontend; npm run e2e:install`
- Run E2E (CI-mode): `cd frontend; E2E_BASE_URL=http://localhost:5173 npm run e2e:ci`

Notes:
- The Keycloak realm export includes a deterministic test user for E2E (`e2etestuser` / `Password`).
- The frontend requires `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, and `VITE_KEYCLOAK_CLIENT_ID` (defaults are wired in `docker-compose.yml`).

## Local integration via Docker Compose

The PR CI pipeline builds the local Docker images and validates them via `docker compose`.

- Start services (if using the repo helper): `./manage-services.ps1 start`
- Or use docker compose directly (CI-equivalent): `docker compose up -d --build`

## Terraform developer workflow (local)

Terraform code lives in `infra/terraform/`.

- Format: `terraform fmt -recursive`

### Validate config (no Azure, no remote state)

This only checks Terraform syntax and module wiring:

- `cd infra/terraform`
- `terraform init -backend=false`
- `terraform validate`

Expected output:
- `Success! The configuration is valid.`

### Plan against Azure (requires bootstrap + Azure auth)

Because the root module reads the resource group using `data.azurerm_resource_group`, a real plan requires Azure credentials and the environment resource group to exist.

Prereqs:
- Run the bootstrap script for the target environment: `scripts/azure/gha-bootstrap.sh`
- Authenticate locally (example): `az login`

Required variables that must NOT be committed to `terraform.<env>.tfvars`:
- `TF_VAR_postgres_admin_username`
- `TF_VAR_postgres_admin_password`

Example (PowerShell):

```powershell
cd infra/terraform

# Provide required sensitive vars via environment.
$env:TF_VAR_postgres_admin_username = "<username>"
$env:TF_VAR_postgres_admin_password = "<password>"

terraform init -backend=false
terraform plan -var-file=terraform.dev.tfvars
```

## GitHub Actions usage

- **PRs**: open a PR; required checks run automatically.
- **Deployments**: use `workflow_dispatch` workflows, selecting `app_env` (e.g., dev/test/prod). GitHub Environments gate apply/deploy via approvals.

## One-time setup: Azure OIDC + TF state + GitHub Environments

A non-interactive Bash script at `scripts/azure/gha-bootstrap.sh` bootstraps:
- user-assigned managed identity for GitHub Actions
- OIDC federated identity credentials (no client secret)
- Azure Storage account + container for Terraform state
- GitHub Environment creation + secret/var wiring
- role assignments required for deployments

Prerequisites:
- Azure CLI logged in (`az login`)
- GitHub CLI logged in (`gh auth login`) with repo admin permissions
- Bash environment (WSL or Git Bash on Windows)

## Required GitHub variables/secrets

Exact names are defined in `contracts/github-actions-workflows.md`, but the intent is:

- GHCR: use `GITHUB_TOKEN` for pushing images to GHCR (packages write permission required)
- Azure auth: use OIDC federation with `azure/login` (no long-lived client secret)
- IP allow list: store as a secret and pass to Terraform as a variable
- Key Vault: store only `KEY_VAULT_NAME` in GitHub; secrets live in Key Vault

Additionally, Terraform workflows expect environment-scoped secrets for Postgres provisioning:
- `POSTGRES_ADMIN_USERNAME`
- `POSTGRES_ADMIN_PASSWORD`
