# Implementation Plan: Modular IaC & CI/CD (Azure + Terraform + GitHub Actions)

**Branch**: `001-modular-terraform-cicd` | **Date**: 2025-12-29 | **Spec**: `specs/001-modular-terraform-cicd/spec.md`
**Input**: Feature specification from `/specs/001-modular-terraform-cicd/spec.md`

**Note**: This plan is authored as `/speckit.plan` output and stops after Phase 2 planning (no implementation).

## Summary

Add modular Terraform IaC and GitHub Actions CI/CD to make infrastructure changes reproducible/reviewable and to enforce repo quality gates on PRs.

Key outcomes:
- PR CI runs backend/frontend lint + tests (+ E2E when user journeys are impacted) and runs Terraform `fmt`/`validate` + produces a plan summary for infra changes.
- CD builds and publishes versioned container images to `ghcr.io` (artifact publication), while *deploying* infrastructure/app updates remains explicitly gated via `workflow_dispatch`.
- Terraform provisions Azure networking (VNet + 2 subnets + NSGs), Azure Database for PostgreSQL Flexible Server (private access), Azure Container Apps (main container + Keycloak sidecar + Flyway init container), Log Analytics wiring, and environment isolation via `app_env`.

## Technical Context

**Language/Version**: TypeScript (strict) | Node.js (repo-managed)  
**Primary Dependencies**: NestJS 11 (backend), React 19 (frontend), Prisma 7 (ORM), Keycloak (auth), Terraform (IaC), Docker + Docker Compose (integration), GitHub Actions (CI/CD)  
**Storage**: PostgreSQL (Azure Database for PostgreSQL Flexible Server in target Azure topology)  
**Testing**: Vitest (backend + frontend), Playwright (frontend E2E)  
**Target Platform**: Azure Container Apps + Azure Database for PostgreSQL Flexible Server (private access / VNet integration)  
**Project Type**: Web application (separate `backend/` and `frontend/`)  
**Performance Goals**:
- CI: ≥95% of PRs complete required checks in < 15 minutes (SC-001)
- Backend/API budgets and frontend budgets per Constitution (Principle IV)
**Constraints**:
- Terraform is the source of truth for infra; remote state required; plans visible in PRs; applies gated
- Azure VNet with two subnets + NSGs (data subnet for Postgres; app platform subnet for Container Apps)
- Azure region: Canada Central (`canadacentral`)
- Container Apps: scale-to-zero; external ingress; explicit IP allow-list (Allow rules only) and implicit deny-all; allow list passed from GitHub Actions secrets into Terraform
- Single Azure subscription; `app_env` drives naming + resource isolation and maps to GitHub Environments
- Secrets strategy: secrets stored in Azure Key Vault (read at runtime), not GitHub
- Keycloak persistence: Keycloak uses the same Postgres server instance as the app with a different database (mirrors `docker-compose.yml`)
**Scale/Scope**:
- Minimum: dev/test/prod logical environments (even if only dev is provisioned first)
- Containers published to `ghcr.io` with immutable tags (commit SHA)

All previously marked `NEEDS CLARIFICATION` items are resolved in `research.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Concrete gates (from `.specify/memory/constitution.md`):
- Lint/format must pass for backend + frontend (ESLint + Prettier)
- Tests + coverage: backend lines ≥ 85%, branches ≥ 75%; frontend critical logic lines ≥ 80%
- E2E: Playwright suite must pass when user journeys are impacted
- Secrets hygiene: no secrets committed; workflows least-privilege permissions; do not echo secrets
- IaC gates (Principle V):
  - `terraform fmt` and `terraform validate` must pass for IaC changes
  - PRs with infra changes must include a reviewed Terraform plan summary
- Bash IaC scripts (if introduced): must be non-interactive, `set -euo pipefail`, ShellCheck-clean

## Project Structure

### Documentation (this feature)

```text
specs/001-modular-terraform-cicd/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   ├── common/
│   └── prisma/
└── tests/
    ├── contract/
    └── unit/

frontend/
├── src/
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── stores/
│   └── styles/
└── tests/
    └── unit/

.github/
└── workflows/           # GitHub Actions pipelines (to be added/updated)

infra/
└── terraform/           # Terraform root(s) + modules (to be added)
    ├── modules/
  └── terraform.<env>.tfvars

docker-compose.yml       # Used for local/CI integration runs
manage-services.ps1      # Local Docker services helper (Postgres/Keycloak)
```

**Structure Decision**: Web application (existing `backend/` + `frontend/`) plus a new `infra/terraform/` area for modular IaC and `.github/workflows/` for CI/CD.

## Complexity Tracking

No planned constitution violations.

## Phase 0: Outline & Research

Output: `specs/001-modular-terraform-cicd/research.md`.

Research goals:
- Confirm Azure Container Apps constraints (multi-container support, init containers, scale-to-zero caveats, IP allow-list behavior, subnet sizing/delegation).
- Confirm Azure Database for PostgreSQL Flexible Server private access requirements (delegated subnet, private DNS mandatory, NSG constraints).
- Confirm modular Terraform best practices and how to prefer AVM modules while retaining fallback paths.

## Phase 1: Design & Contracts

Outputs:
- `specs/001-modular-terraform-cicd/data-model.md`
- `specs/001-modular-terraform-cicd/contracts/*`
- `specs/001-modular-terraform-cicd/quickstart.md`

High-level design decisions (subject to `research.md`):
- Terraform layout: a single root module under `infra/terraform/` with shared internal modules under `infra/terraform/modules/*`.
- Per-environment static config is provided via `terraform.<env>.tfvars` files (e.g., `terraform.dev.tfvars`, `terraform.test.tfvars`, `terraform.prod.tfvars`).
- Use remote state in Azure Storage; state key partitioned by `app_env` (passed via the selected tfvars file).
- Azure resources per `app_env`:
  - VNet with two subnets: `data` (delegated to PostgreSQL flexible servers) and `aca` (delegated to Container Apps environments)
  - NSGs attached to each subnet
  - PostgreSQL flexible server with private access (VNet integration) in `data` subnet
  - Container Apps environment in `aca` subnet; one Container App with:
    - main container (frontend+backend)
    - sidecar container (Keycloak)
    - init container (Flyway)
    - ingress enabled + IP allow-list rules (allow CIDRs passed from GitHub Actions)
    - scaling configured to allow scale-to-zero where appropriate
  - Log Analytics workspace + diagnostic settings wiring for Container Apps and Postgres

Contracts to publish:
- GitHub Actions workflow contracts (triggers, required secrets/vars, artifacts)
- Terraform module interfaces (inputs/outputs) and environment model (`app_env`)

Design artifacts generated by this plan run:
- `specs/001-modular-terraform-cicd/research.md`
- `specs/001-modular-terraform-cicd/data-model.md`
- `specs/001-modular-terraform-cicd/quickstart.md`
- `specs/001-modular-terraform-cicd/contracts/github-actions-workflows.md`
- `specs/001-modular-terraform-cicd/contracts/terraform-interfaces.md`

## Phase 1: Update Agent Context

Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot` after Phase 1 artifacts are created.

Status: completed (updated `.github/agents/copilot-instructions.md`).

## Phase 2: Planning (for /speckit.tasks)

This plan intentionally does not generate `tasks.md`.

Expected task areas for `/speckit.tasks`:
- Add `infra/terraform/` skeleton + remote state conventions + modules
- Add GitHub Actions workflows (PR CI + artifact publish + manual deploy)
- Document local workflows + required secrets/vars

## Constitution Check (Post-Design Recheck)

The plan’s artifacts support the Constitution gates as follows:
- IaC/CI gates are explicitly scoped and documented in `research.md` and `contracts/*`.
- Local developer workflow parity is documented in `quickstart.md`.

Remaining blockers before implementation:
- Generate `tasks.md` via `/speckit.tasks` (include the local Bash bootstrap script and the Key Vault + shared-Postgres Keycloak decisions).
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
