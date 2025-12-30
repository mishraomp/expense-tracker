# Phase 0 Research: Modular IaC & CI/CD (Azure + Terraform + GitHub Actions)

This document resolves the `NEEDS CLARIFICATION` items from `plan.md` and captures decisions with rationale and alternatives.

## Decision: Azure region = Canada Central

- **Decision**: Default all Azure resources for this feature to **Canada Central** (`canadacentral`).
- **Rationale**: Explicit requirement.

## Decision: Use Azure Container Apps with multi-container (main + Keycloak sidecar + Flyway init)

- **Decision**: Use a single Azure Container App containing:
  - **Main container**: app runtime (frontend + backend)
  - **Sidecar container**: Keycloak
  - **Init container**: Flyway DB migration
- **Rationale**:
  - Azure Container Apps supports both **sidecar** and **init** containers within a single container app for tightly coupled components.
  - Multi-container apps share lifecycle/resources; this matches the “tightly coupled” requirement for Keycloak + app + init DB bootstrap.
- **Alternatives considered**:
  - Split into separate Container Apps (preferred for microservices, but conflicts with the explicit “single container app with sidecar + init” requirement).
- **References**:
  - https://learn.microsoft.com/en-us/azure/container-apps/containers#multiple-containers

## Decision: Environment type = Workload Profiles environment for Container Apps VNet integration

- **Decision**: Use a **Workload Profiles** Container Apps environment for VNet integration.
- **Rationale**:
  - Supports a smaller dedicated subnet (/27 minimum) and subnet delegation to `Microsoft.App/environments`.
  - Better fit for enterprise networking features and predictable subnet planning.
- **Alternatives considered**:
  - Consumption-only environment:
    - Requires /23 minimum subnet and must not be delegated.
    - Reserved IPs can increase as apps scale.
- **References**:
  - https://learn.microsoft.com/en-us/azure/container-apps/custom-virtual-networks#subnet
  - https://learn.microsoft.com/en-us/azure/container-apps/networking

## Decision: Ingress posture = External ingress + IP allow-list (CIDR)

- **Decision**: Use **external ingress** for the app and enforce an **Allow-only IP restriction set** from a GitHub Actions secret-derived allow list.
- **Rationale**:
  - Meets the “IP restricted” requirement with a simple operational model.
  - Azure Container Apps IP restrictions:
    - No rules == allow all
    - All rules must be same action (can’t mix Allow and Deny)
    - IPv4 CIDR only
- **Alternatives considered**:
  - Internal environment + private endpoints + gateway/Front Door:
    - More secure perimeter, but heavier infrastructure and not required for initial scope.
- **References**:
  - https://learn.microsoft.com/en-us/azure/container-apps/ip-restrictions
  - https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to
  - https://learn.microsoft.com/en-us/azure/container-apps/networking#accessibility-level

## Decision: Scale-to-zero strategy

- **Decision**: Configure Container Apps scale with `minReplicas: 0` for scale-to-zero where cold starts are acceptable.
- **Rationale**:
  - Container Apps supports scale-to-zero; this is aligned with the requirement.
  - Avoid over-promising always-warm behavior; cold starts are expected when `minReplicas = 0`.
- **Alternatives considered**:
  - `minReplicas >= 1` for always-on behavior (higher cost).
- **Important caveats**:
  - Multi-revision behavior and some features can impact scale behavior.
  - Dapr actors do not support scale-to-zero.
- **References**:
  - https://learn.microsoft.com/en-us/azure/container-apps/scale-app

## Decision: Postgres = Azure Database for PostgreSQL Flexible Server with private access (VNet integration)

- **Decision**: Use **Azure Database for PostgreSQL Flexible Server** in the **data subnet** with **private access (VNet integration)**.
- **Rationale**:
  - Meets the “Postgres hosted in data subnet” requirement.
  - Supports private IP access for the app without exposing a public endpoint.
- **Operational constraints**:
  - Requires a **delegated subnet** (`Microsoft.DBforPostgreSQL/flexibleServers`) and no other resource types can be in that subnet.
  - Minimum subnet size is /28 (recommend sizing larger due to immutability + HA IP usage).
  - Private DNS zone is mandatory for name resolution.
- **Alternatives considered**:
  - Public access + Private Endpoint (Private Link): useful when Private Link topology is preferred.
- **References**:
  - https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private
  - https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private-link

## Decision: Keycloak persistence = same Postgres server, separate database

- **Decision**: Provision a separate **`keycloak`** database on the same Postgres server instance used by the application database (mirrors `docker-compose.yml`).
- **Rationale**:
  - Keeps the Azure topology aligned with local development.
  - Avoids operating a second Postgres server for Keycloak.

## Decision: Secrets store = Azure Key Vault

- **Decision**: Store application secrets in **Azure Key Vault**.
- **Rationale**:
  - Central secret management and auditing.
  - Avoids long-lived credentials stored in GitHub.

## Decision: NSG posture for Postgres delegated subnet

- **Decision**: Attach an NSG to the Postgres subnet and explicitly allow required flows.
- **Rationale**:
  - PostgreSQL Flexible Server relies on specific flows (including intra-subnet port 5432 and outbound to Storage).
  - Avoid ASG-based rules for this subnet (not supported).
- **References**:
  - https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private

## Decision: Diagnostics = Log Analytics workspace + diagnostic settings

- **Decision**: Provision a Log Analytics workspace per `app_env` (or shared per subscription if later desired) and wire diagnostics for Container Apps and Postgres.
- **Rationale**:
  - Required by the feature constraints; provides central observability.
- **References**:
  - https://learn.microsoft.com/en-us/azure/container-apps/log-options

## Decision: Terraform structure + AVM preference

- **Decision**: Create `infra/terraform/` using env roots under `envs/<app_env>/` and internal modules under `modules/`, preferring **Azure Verified Modules (AVM)** where available.
- **Rationale**:
  - Env roots naturally isolate state/blast radius per environment.
  - AVM provides standardized modules and interfaces; where AVM modules do not exist, implement internal modules with “AVM-like” interfaces.
- **Alternatives considered**:
  - Terraform workspaces as the primary environment separator (less explicit; can hide complexity).
- **References**:
  - https://azure.github.io/Azure-Verified-Modules/
  - https://azure.github.io/Azure-Verified-Modules/specs/tf/
  - https://learn.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage?tabs=azure-cli

## Decision: GitHub Actions split = PR CI vs manual deploy

- **Decision**:
  - PR CI workflows run on `pull_request` to enforce lint/tests/E2E and IaC checks.
  - Deployment (Terraform apply + updating running app) occurs only via `workflow_dispatch` and protected GitHub Environments.
  - Artifact publication (building/pushing images to GHCR) can occur on merges to default branch (does not itself deploy).
- **Rationale**:
  - Matches “deploy only via workflow_dispatch” while meeting “automatic artifacts on merges.”
- **References**:
  - Container Apps can deploy GHCR images (requires registry auth for non-ACR registries):
    - https://learn.microsoft.com/en-us/azure/container-apps/github-actions#deploy-images-from-non-acr-registries

## Implementation note: GitHub Actions bootstrap config

- **Decision**: Add a local, non-interactive Bash script (`scripts/azure/gha-bootstrap.sh`) that bootstraps Azure OIDC for GitHub Actions, Terraform remote state, GitHub Environments, and role assignments.
