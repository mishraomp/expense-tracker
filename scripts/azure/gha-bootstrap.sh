#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[gha-bootstrap] %s\n' "$*" >&2
}

die() {
  printf '[gha-bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

ensure_provider_registered() {
  local namespace="$1"
  local state=''

  state="$(az provider show --namespace "$namespace" --subscription "$SUBSCRIPTION_ID" --query registrationState -o tsv 2>/dev/null || true)"
  if [[ -z "$state" ]]; then
    die "Unable to query provider registration state for '$namespace' (subscription $SUBSCRIPTION_ID)."
  fi

  if [[ "$state" == 'Registered' ]]; then
    return 0
  fi

  if [[ "$state" == 'NotRegistered' ]]; then
    log "Registering Azure provider: $namespace"
    az provider register --namespace "$namespace" --subscription "$SUBSCRIPTION_ID" >/dev/null
  else
    log "Azure provider $namespace is in state: $state"
  fi

  # Wait until registered.
  # Provider registration can be slow on new subscriptions.
  local start_ts
  local now_ts
  start_ts="$(date +%s)"
  while true; do
    state="$(az provider show --namespace "$namespace" --subscription "$SUBSCRIPTION_ID" --query registrationState -o tsv)"
    if [[ "$state" == 'Registered' ]]; then
      return 0
    fi

    now_ts="$(date +%s)"
    if (( now_ts - start_ts > 600 )); then
      die "Timed out waiting for provider '$namespace' to register (last state: $state)."
    fi

    sleep 5
  done
}

usage() {
  cat <<'EOF'
Bootstraps Azure OIDC auth + Terraform remote state + GitHub Environment secrets.

Prereqs:
  - az CLI authenticated: az login
  - gh CLI authenticated: gh auth login
  - Permissions:
      * Azure: Owner/User Access Admin (or equivalent) for role assignments + resource creation
  * Azure: ability to register resource providers (e.g., Microsoft.Storage) on the target subscription
      * GitHub: repo admin to create environments + set environment secrets

Required args:
  --repo OWNER/REPO
  --app-env dev|test|prod
  --resource-group RESOURCE_GROUP
  --identity-name NAME
  --storage-account NAME

Optional args:
  --location canadacentral             (default: canadacentral)
  --storage-container tfstate          (default: tfstate)
  --ip-allow-list-cidrs "1.2.3.4/32,5.6.0.0/16"  (recommended)
  --key-vault-name NAME                (if already chosen/created)
  --role-scope SCOPE                   (default: subscription scope)
  --subscription-id ID                 (default: from az account)
  --tenant-id ID                       (default: from az account)

Notes:
  - The script sets `AZURE_RESOURCE_GROUP` as a GitHub Environment variable for the selected environment.
  - The same Azure Resource Group is reused for managed identity, Terraform state storage, and all Terraform-managed resources.

Example:
  ./scripts/azure/gha-bootstrap.sh \
    --repo my-org/expense-tracker \
    --app-env dev \
    --resource-group et-dev-rg \
    --identity-name et-dev-gha \
    --storage-account etdevtfstateabc123 \
    --ip-allow-list-cidrs "203.0.113.10/32,198.51.100.0/24" \
    --key-vault-name et-dev-kv
EOF
}

REPO=''
APP_ENV=''
LOCATION='Canada Central'
RESOURCE_GROUP=''
IDENTITY_NAME=''
STORAGE_ACCOUNT=''
STORAGE_CONTAINER='tfstate'
IP_ALLOW_LIST_CIDRS=''
KEY_VAULT_NAME=''
ROLE_SCOPE=''
SUBSCRIPTION_ID=''
TENANT_ID=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"; shift 2 ;;
    --app-env)
      APP_ENV="$2"; shift 2 ;;
    --location)
      LOCATION="$2"; shift 2 ;;
    --resource-group)
      RESOURCE_GROUP="$2"; shift 2 ;;
    --identity-name)
      IDENTITY_NAME="$2"; shift 2 ;;
    --storage-account)
      STORAGE_ACCOUNT="$2"; shift 2 ;;
    --storage-container)
      STORAGE_CONTAINER="$2"; shift 2 ;;
    --ip-allow-list-cidrs)
      IP_ALLOW_LIST_CIDRS="$2"; shift 2 ;;
    --key-vault-name)
      KEY_VAULT_NAME="$2"; shift 2 ;;
    --role-scope)
      ROLE_SCOPE="$2"; shift 2 ;;
    --subscription-id)
      SUBSCRIPTION_ID="$2"; shift 2 ;;
    --tenant-id)
      TENANT_ID="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      die "Unknown argument: $1" ;;
  esac
done

[[ -n "$REPO" ]] || { usage; die "--repo is required"; }
[[ -n "$APP_ENV" ]] || { usage; die "--app-env is required"; }
[[ "$APP_ENV" == 'dev' || "$APP_ENV" == 'test' || "$APP_ENV" == 'prod' ]] || die "--app-env must be one of dev|test|prod"
[[ -n "$RESOURCE_GROUP" ]] || { usage; die "--resource-group is required"; }
[[ -n "$IDENTITY_NAME" ]] || { usage; die "--identity-name is required"; }
[[ -n "$STORAGE_ACCOUNT" ]] || { usage; die "--storage-account is required"; }

require_cmd az
require_cmd gh

log "Validating Azure CLI session"
az account show >/dev/null

if [[ -z "$SUBSCRIPTION_ID" ]]; then
  SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
fi

log "Validating subscription access: $SUBSCRIPTION_ID"
if ! az account show --subscription "$SUBSCRIPTION_ID" >/dev/null 2>&1; then
  log "Available subscriptions for current az login:"
  az account list --query "[].{name:name,id:id,isDefault:isDefault,tenantId:tenantId,state:state}" -o table >&2 || true
  die "Subscription $SUBSCRIPTION_ID not found for current az login. Pass --subscription-id explicitly or re-run 'az login' (optionally with --tenant)."
fi

SUBSCRIPTION_TENANT_ID="$(az account show --subscription "$SUBSCRIPTION_ID" --query tenantId -o tsv)"
if [[ -z "$TENANT_ID" ]]; then
  TENANT_ID="$SUBSCRIPTION_TENANT_ID"
elif [[ "$TENANT_ID" != "$SUBSCRIPTION_TENANT_ID" ]]; then
  die "--tenant-id ($TENANT_ID) does not match the tenant for subscription $SUBSCRIPTION_ID ($SUBSCRIPTION_TENANT_ID)."
fi

if [[ -z "$ROLE_SCOPE" ]]; then
  ROLE_SCOPE="/subscriptions/${SUBSCRIPTION_ID}"
fi

log "Ensuring required Azure resource providers are registered"
# Namespaces needed by this repo's Terraform (and this bootstrap) for Storage, Identity, Network, Key Vault,
# Postgres Flexible Server, Container Apps, and monitoring.
ensure_provider_registered 'Microsoft.Storage'
ensure_provider_registered 'Microsoft.ManagedIdentity'
ensure_provider_registered 'Microsoft.Network'
ensure_provider_registered 'Microsoft.KeyVault'
ensure_provider_registered 'Microsoft.DBforPostgreSQL'
ensure_provider_registered 'Microsoft.App'
ensure_provider_registered 'Microsoft.OperationalInsights'
ensure_provider_registered 'Microsoft.Insights'

log "Validating GitHub CLI session"
gh auth status >/dev/null

log "Ensuring GitHub environment exists: $APP_ENV"
# Minimal environment create/update.
gh api -X PUT "repos/${REPO}/environments/${APP_ENV}" -F wait_timer=0 >/dev/null

log "Ensuring Azure resource groups exist"
az group create --subscription "$SUBSCRIPTION_ID" --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null

log "Creating (or reusing) user-assigned managed identity: $IDENTITY_NAME"
if ! az identity show --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --name "$IDENTITY_NAME" >/dev/null 2>&1; then
  az identity create --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --name "$IDENTITY_NAME" --location "$LOCATION" >/dev/null
fi

IDENTITY_CLIENT_ID="$(az identity show --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --name "$IDENTITY_NAME" --query clientId -o tsv)"
IDENTITY_PRINCIPAL_ID="$(az identity show --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --name "$IDENTITY_NAME" --query principalId -o tsv)"

log "Configuring OIDC federated credential for GitHub Environment subject"
FED_NAME="github-${APP_ENV}"
ISSUER='https://token.actions.githubusercontent.com'
SUBJECT="repo:${REPO}:environment:${APP_ENV}"
AUDIENCE='api://AzureADTokenExchange'

# Idempotency: try show; create if missing.
if ! az identity federated-credential show --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --identity-name "$IDENTITY_NAME" --name "$FED_NAME" >/dev/null 2>&1; then
  az identity federated-credential create \
    --subscription "$SUBSCRIPTION_ID" \
    --resource-group "$RESOURCE_GROUP" \
    --identity-name "$IDENTITY_NAME" \
    --name "$FED_NAME" \
    --issuer "$ISSUER" \
    --subject "$SUBJECT" \
    --audiences "$AUDIENCE" >/dev/null
fi

log "Creating (or reusing) storage account for Terraform state: $STORAGE_ACCOUNT"
if ! az storage account show --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --name "$STORAGE_ACCOUNT" >/dev/null 2>&1; then
  az storage account create \
    --subscription "$SUBSCRIPTION_ID" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$STORAGE_ACCOUNT" \
    --location "$LOCATION" \
    --kind 'StorageV2' \
    --access-tier 'Hot' \
    --default-action 'Allow' \
    --bypass 'AzureServices' \
    --enable-local-user false \
    --sku Standard_LRS \
    --https-only true \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false >/dev/null
fi

STORAGE_ACCOUNT_ID="$(az storage account show --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --name "$STORAGE_ACCOUNT" --query id -o tsv)"

log "Creating state container: $STORAGE_CONTAINER"
# Uses the current az identity (developer) for the one-time container create.
az storage container create \
  --name "$STORAGE_CONTAINER" \
  --account-name "$STORAGE_ACCOUNT" \
  --auth-mode login >/dev/null

log "Assigning Azure roles to the managed identity"
# Deployment permissions (scope configurable; defaults to subscription).
az role assignment create \
  --subscription "$SUBSCRIPTION_ID" \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role Contributor \
  --scope "$ROLE_SCOPE" >/dev/null || true

# Terraform state access.
az role assignment create \
  --subscription "$SUBSCRIPTION_ID" \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "$STORAGE_ACCOUNT_ID" >/dev/null || true

log "Setting GitHub environment secrets"
# OIDC auth
gh secret set -e "$APP_ENV" AZURE_TENANT_ID --repo "$REPO" --body "$TENANT_ID" >/dev/null
gh secret set -e "$APP_ENV" AZURE_SUBSCRIPTION_ID --repo "$REPO" --body "$SUBSCRIPTION_ID" >/dev/null
gh secret set -e "$APP_ENV" AZURE_CLIENT_ID --repo "$REPO" --body "$IDENTITY_CLIENT_ID" >/dev/null

# Resource group (reused for all Terraform-managed resources)
gh variable set AZURE_RESOURCE_GROUP --repo "$REPO" --env "$APP_ENV" --body "$RESOURCE_GROUP" >/dev/null

# TF state (stored as secrets for now; values are not sensitive but are consumed by workflows)
gh secret set -e "$APP_ENV" TFSTATE_RESOURCE_GROUP --repo "$REPO" --body "$RESOURCE_GROUP" >/dev/null
gh secret set -e "$APP_ENV" TFSTATE_STORAGE_ACCOUNT --repo "$REPO" --body "$STORAGE_ACCOUNT" >/dev/null
gh secret set -e "$APP_ENV" TFSTATE_CONTAINER --repo "$REPO" --body "$STORAGE_CONTAINER" >/dev/null

# App ingress allow-list
if [[ -n "$IP_ALLOW_LIST_CIDRS" ]]; then
  gh secret set -e "$APP_ENV" IP_ALLOW_LIST_CIDRS --repo "$REPO" --body "$IP_ALLOW_LIST_CIDRS" >/dev/null
else
  log "NOTE: --ip-allow-list-cidrs not provided; IP_ALLOW_LIST_CIDRS secret not set"
fi

# Key Vault reference
if [[ -n "$KEY_VAULT_NAME" ]]; then
  gh secret set -e "$APP_ENV" KEY_VAULT_NAME --repo "$REPO" --body "$KEY_VAULT_NAME" >/dev/null
fi

log "Done"
log "Azure OIDC client-id (managed identity): $IDENTITY_CLIENT_ID"
log "Resource group: $RESOURCE_GROUP"
log "Terraform state: rg=$RESOURCE_GROUP sa=$STORAGE_ACCOUNT container=$STORAGE_CONTAINER"
