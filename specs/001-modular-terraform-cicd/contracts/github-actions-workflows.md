# Contract: GitHub Actions Workflows

This contract defines the intended workflows, their triggers, required permissions, inputs, and produced artifacts.

## Org-wide policy: permissions + concurrency

### Permissions

- All workflows MUST declare a top-level `permissions:` block (do not rely on GitHub defaults).
- Start from `contents: read` and add only what is required.
- Azure OIDC auth requires `id-token: write` (for `azure/login`).
- If a workflow comments on PRs, it requires `pull-requests: write`.
- If a workflow pushes to GHCR, it requires `packages: write`.
- If a workflow uploads artifacts, it requires `actions: write`.

### Concurrency

- CI workflows SHOULD use a concurrency group to cancel superseded runs on the same ref:
  - Example: `group: ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`
- Terraform workflows MUST use concurrency groups to avoid state corruption:
  - Plan workflows SHOULD avoid duplicate runs per PR:
    - Example: `group: tf-plan-${{ github.workflow }}-${{ github.event.pull_request.number }}`, `cancel-in-progress: true`
  - Apply workflows MUST serialize per environment:
    - Example: `group: tf-apply-${{ github.workflow }}-${{ inputs.app_env }}`, `cancel-in-progress: false`
- Publish workflows SHOULD cancel superseded runs on the same branch:
  - Example: `group: publish-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`

## Workflow: PR CI (`ci.yml`)

- **Trigger**: `pull_request`
- **Purpose**: enforce Constitution gates for backend + frontend, and run safe checks on forks.
- **Permissions (principle of least privilege)**:
  - Default: `contents: read`
  - Required for artifacts (e.g., Playwright report): `actions: write`
  - Add only what’s required (e.g., `pull-requests: write` to post a plan summary comment)
- **Jobs**:
  - Backend: `npm ci`, lint, test, coverage gate
  - Frontend: `npm ci`, lint, test
  - E2E: run when user-journey-impacting changes detected (policy to be defined in implementation)
  - Container build: build images (tag = commit SHA) for integration validation
  - Compose validation: start `docker compose` using built images and run CI-mode smoke checks

## Workflow: Terraform plan (`terraform-plan.yml`)

- **Trigger**: `pull_request` (only when files under `infra/terraform/**` change)
- **Purpose**: Terraform formatting/validation + produce a reviewable plan summary.
- **Permissions**:
  - `contents: read`
  - `pull-requests: write` (to attach a plan summary)
  - `id-token: write` (required for Azure OIDC)
  - `actions: write` (to upload the full plan artifact)
  - Azure auth should use OIDC with `azure/login`
- **Outputs**:
  - Plan summary comment (redacted; no secrets)
  - Optional artifact: `plan.txt` or `plan.json`

## Workflow: Publish images (`publish-images.yml`)

- **Trigger**: `push` to default branch (and optionally tags)
- **Purpose**: publish versioned container images to `ghcr.io`.
- **Permissions**:
  - `contents: read`
  - `packages: write`
  - `actions: write` (to upload build metadata)
- **Artifacts**:
  - GHCR images tagged by commit SHA

## Workflow: Deploy (`deploy.yml`)

- **Trigger**: `workflow_dispatch`
- **Purpose**: gated deployment (Terraform apply + update running app).
- **Inputs**:
  - `app_env`: one of `dev|test|prod`
  - `image_tag`: commit SHA (optional; defaults to latest successful main build)
- **Gating**:
  - Uses GitHub Environments matching `app_env` for approvals

## Secrets/Vars (environment-scoped)

These are intended to be configured per GitHub Environment (`dev`, `test`, `prod`). A local bootstrap script will automate creating the environment + configuring these.

**Azure OIDC (no client secret)**
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_ID` (user-assigned managed identity client ID)

**Azure target resource group**
- `AZURE_RESOURCE_GROUP` (GitHub Environment variable; the single RG reused for Terraform state + all Terraform-managed resources)

**Terraform remote state (Azure Storage)**
- `TFSTATE_RESOURCE_GROUP`
- `TFSTATE_STORAGE_ACCOUNT`
- `TFSTATE_CONTAINER`

**Networking**
- `IP_ALLOW_LIST_CIDRS` (serialized list of IPv4 CIDRs; used to build Allow rules for Container Apps ingress)

**Secrets strategy**
- `KEY_VAULT_NAME` (Key Vault is the system of record for app secrets; GitHub should not store long-lived app secrets)

**Terraform provisioning secrets (environment-scoped)**
- `POSTGRES_ADMIN_USERNAME`
- `POSTGRES_ADMIN_PASSWORD`
