# Azure bootstrap scripts

This folder contains non-interactive Bash scripts intended to bootstrap Azure and GitHub Actions configuration.

## Script: `gha-bootstrap.sh`

Bootstraps:
- user-assigned managed identity for GitHub Actions
- OIDC federated identity credentials (no client secret)
- Azure Storage account + container for Terraform remote state
- GitHub Environment creation + environment secrets/vars
- role assignments required for deployments

### Key behavior

- The script sets `AZURE_RESOURCE_GROUP` as a GitHub Environment variable for the selected environment.
- The same Azure Resource Group is reused for managed identity, Terraform state storage, and all Terraform-managed resources.
- Secrets are never printed to logs.

### Prerequisites

- Azure CLI authenticated: `az login`
- GitHub CLI authenticated: `gh auth login`
- Permissions:
  - Azure: Owner/User Access Admin (or equivalent) for role assignments + resource creation
  - GitHub: repo admin permissions to create environments and set environment secrets/vars

### Example

```bash
./scripts/azure/gha-bootstrap.sh \
  --repo OWNER/REPO \
  --app-env dev \
  --resource-group et-dev-rg \
  --identity-name et-dev-gha \
  --storage-account etdevtfstateabc123 \
  --storage-container tfstate \
  --ip-allow-list-cidrs "203.0.113.10/32,198.51.100.0/24" \
  --key-vault-name et-dev-kv
```

### Outputs (GitHub Environment)

Environment secrets:
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_ID`
- `TFSTATE_RESOURCE_GROUP`
- `TFSTATE_STORAGE_ACCOUNT`
- `TFSTATE_CONTAINER`
- `IP_ALLOW_LIST_CIDRS` (if provided)
- `KEY_VAULT_NAME` (if provided)

Additional secrets required by Terraform workflows (set these manually per environment):
- `POSTGRES_ADMIN_USERNAME`
- `POSTGRES_ADMIN_PASSWORD`

Environment variables:
- `AZURE_RESOURCE_GROUP`
