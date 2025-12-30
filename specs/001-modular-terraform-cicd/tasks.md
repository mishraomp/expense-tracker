---

description: "Actionable tasks for Modular IaC & CI/CD"

---

# Tasks: Modular IaC & CI/CD (Azure + Terraform + GitHub Actions)

**Input**: Design documents from `/specs/001-modular-terraform-cicd/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), plus `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the project constitution. This feature primarily wires CI/CD + IaC; the tasks below ensure CI runs existing backend/frontend unit tests + coverage and runs Playwright E2E when user-journey-impacting changes occur.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description (with file path)`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish repository scaffolding for IaC + workflows and align docs.

- [X] T001 Create IaC folder skeleton in `infra/terraform/` (single root + modules + `terraform.<env>.tfvars`)
- [X] T002 [P] Add Terraform gitignore entries in `.gitignore` for `.terraform/`, `*.tfstate*`, `.terraform.lock.hcl` (do not commit state)
- [X] T003 [P] Add IaC formatting conventions to `README.md` (how to run `terraform fmt -recursive` and `terraform validate`)
- [X] T004 [P] Document bootstrap flow in `specs/001-modular-terraform-cicd/quickstart.md` (reference `scripts/azure/gha-bootstrap.sh`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline CI/CD + IaC plumbing that blocks all user stories.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 Pin GitHub Actions permissions + concurrency policy (org-wide guidance) in `specs/001-modular-terraform-cicd/contracts/github-actions-workflows.md`
- [X] T006 Create shared GitHub Actions composite for Node setup/caching in `.github/actions/setup-node/action.yml`
- [X] T007 Create shared GitHub Actions composite for npm install (backend/frontend) in `.github/actions/npm-ci/action.yml`
- [X] T008 [P] Add `scripts/azure/gha-bootstrap.sh` usage notes + required permissions in `scripts/azure/README.md`
- [X] T009 [P] Add ShellCheck CI job for bash scripts in `.github/workflows/ci.yml` (or a dedicated `.github/workflows/lint-scripts.yml`)

**Checkpoint**: Repo has shared workflow helpers + script linting baseline.

---

## Phase 3: User Story 1 - PR Quality Gates (Priority: P1) 🎯 MVP

**Goal**: Every PR runs required checks (lint, unit tests + coverage gates, and E2E when user journeys are impacted).

**Independent Test**: Open a PR that changes backend and/or frontend code. Confirm required checks run and report status on the PR.

### Implementation

- [X] T010 [US1] Add PR CI workflow in `.github/workflows/ci.yml` (trigger: `pull_request`)
- [X] T011 [US1] Implement backend CI job in `.github/workflows/ci.yml` using `backend/package.json` scripts (`npm ci`, `npm run lint`, `npm run test:cov`)
- [X] T012 [US1] Implement frontend CI job in `.github/workflows/ci.yml` using `frontend/package.json` scripts (`npm ci`, `npm run lint`, `npm run test:cov`)
- [X] T013 [US1] Enforce coverage thresholds in CI by parsing Vitest coverage outputs (backend + frontend) in `.github/workflows/ci.yml`
- [X] T014 [US1] Add Playwright E2E job to `.github/workflows/ci.yml` and run `frontend` `npm run e2e:install` + `npm run e2e:ci`
- [X] T015 [US1] Add path-based condition for E2E in `.github/workflows/ci.yml` (runs when `frontend/**` or auth-related paths change)
- [X] T016 [US1] Add Docker Compose integration smoke job in `.github/workflows/ci.yml` (build images + `docker compose up` + healthcheck)
- [X] T017 [US1] Ensure PR workflows are safe for forks (no secrets required; skip Azure steps; do not push images)

### Validation

- [X] T018 [US1] Update `specs/001-modular-terraform-cicd/quickstart.md` with exact local equivalents for CI steps (backend/frontend + optional E2E)
- [X] T019 [US1] Add a PR checklist section to `README.md` explaining required checks and how to run them locally

**Checkpoint**: PR CI gates are enforceable and reproducible locally.

---

## Phase 4: User Story 2 - Automated Release Artifacts (Priority: P1)

**Goal**: Merges to default branch (and tags) publish versioned artifacts (GHCR images) with immutable tags.

**Independent Test**: Merge to default branch and verify images are pushed to `ghcr.io` tagged by commit SHA.

### Implementation

- [X] T020 [US2] Add publish workflow in `.github/workflows/publish-images.yml` (trigger: `push` to default branch)
- [X] T021 [US2] Configure `publish-images.yml` permissions (least privilege) and enable `packages: write`
- [X] T022 [US2] Build and push backend image from `backend/docker/Dockerfile` to GHCR in `.github/workflows/publish-images.yml`
- [X] T023 [US2] Build and push frontend image from `frontend/docker/Dockerfile` to GHCR in `.github/workflows/publish-images.yml`
- [X] T024 [US2] Tag images with commit SHA and (optionally) semver tag on release tags in `.github/workflows/publish-images.yml`
- [X] T025 [US2] Publish build metadata (image digests, tags) as workflow artifact in `.github/workflows/publish-images.yml`

### Validation

- [X] T026 [US2] Document artifact tags + rollback guidance in `README.md` (GHCR image tags and how to select an older SHA)

**Checkpoint**: Versioned artifacts are produced automatically and are auditable.

---

## Phase 5: User Story 3 - Modular Infrastructure-as-Code Review (Priority: P2)

**Goal**: IaC is modular and PR-reviewed with terraform fmt/validate/plan; apply is gated behind explicit approval.

**Independent Test**: Create a PR modifying `infra/terraform/**` and verify a plan preview is produced on the PR.

### Implementation: Terraform structure

- [X] T027 [US3] Create Terraform root module in `infra/terraform/` (providers, backend config placeholders; env config via `terraform.<env>.tfvars`)
- [X] T028 [US3] Add `infra/terraform/modules/network/` module (VNet + 2 subnets + NSGs + delegations)
- [X] T029 [US3] Add `infra/terraform/modules/observability/` module (Log Analytics workspace)
- [X] T030 [US3] Add `infra/terraform/modules/key-vault/` module (Key Vault with RBAC + diagnostic settings)
- [X] T031 [US3] Add `infra/terraform/modules/postgres/` module (Flexible Server private access + private DNS + create databases `expense_tracker` + `keycloak`)
- [X] T032 [US3] Add `infra/terraform/modules/container-apps/` module (ACA env + app with main + Keycloak sidecar + Flyway init)
- [X] T033 [US3] Implement ingress restrictions in `infra/terraform/modules/container-apps/` (Allow rules only using `ip_allow_list_cidrs`)
- [X] T034 [US3] Wire Key Vault references into Container Apps in `infra/terraform/modules/container-apps/` (runtime reads from Key Vault)
- [X] T035 [US3] Ensure all modules surface required outputs in `infra/terraform/modules/**/outputs.tf` (subnet IDs, key vault ID, etc.)

### Implementation: Terraform CI + gated apply

- [X] T036 [US3] Add Terraform plan workflow in `.github/workflows/terraform-plan.yml` (trigger: PR changes under `infra/terraform/**`)
- [X] T037 [US3] Configure `terraform-plan.yml` to run `terraform fmt -check -recursive` and `terraform validate` in `infra/terraform/` for each `terraform.<env>.tfvars`
- [X] T038 [US3] Configure `terraform-plan.yml` Azure auth via OIDC (`azure/login`) using env secrets (`AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_ID`)
- [X] T039 [US3] Configure `terraform-plan.yml` remote state using env secrets (`TFSTATE_RESOURCE_GROUP`, `TFSTATE_STORAGE_ACCOUNT`, `TFSTATE_CONTAINER`)
- [X] T039 [US3] Configure `terraform-plan.yml` to use `AZURE_RESOURCE_GROUP` (env var) for resource creation and `TFSTATE_*` for backend state
- [X] T040 [US3] Post a redacted plan summary comment to PR in `.github/workflows/terraform-plan.yml` (no secrets)
- [X] T041 [US3] Add deploy workflow in `.github/workflows/deploy.yml` (trigger: `workflow_dispatch`, input `app_env`)
- [X] T042 [US3] Gate applies using GitHub Environments (environment name = `app_env`) in `.github/workflows/deploy.yml`
- [X] T043 [US3] Implement `terraform apply` (manual, gated) in `.github/workflows/deploy.yml` using `infra/terraform/` and `-var-file=terraform.<app_env>.tfvars`

### Bootstrap tooling

- [X] T044 [US3] Ensure bootstrap script sets `AZURE_RESOURCE_GROUP` as a GitHub Environment variable and reuses that RG for identity, state, and all resources
- [X] T045 [US3] Add bootstrap documentation in `scripts/azure/README.md` including required Azure/GitHub permissions and example usage

### Validation

- [X] T046 [US3] Add IaC local workflow docs in `specs/001-modular-terraform-cicd/quickstart.md` (init/validate/plan in `infra/terraform/` using `terraform.<env>.tfvars`)
- [X] T047 [US3] Run terraform checks locally and record expected outputs in `specs/001-modular-terraform-cicd/quickstart.md`

**Checkpoint**: IaC is modular, reviewable in PRs, and gated for applies.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tighten security, documentation, and operational guardrails.

- [X] T048 [P] Add workflow-level least-privilege permissions review across `.github/workflows/*.yml`
- [X] T049 [P] Add concurrency controls to Terraform workflows to prevent state corruption in `.github/workflows/terraform-plan.yml` and `.github/workflows/deploy.yml`
- [X] T050 Update `specs/001-modular-terraform-cicd/contracts/terraform-interfaces.md` to match implemented module inputs/outputs
- [X] T051 Update `specs/001-modular-terraform-cicd/contracts/github-actions-workflows.md` to match implemented workflows and secrets
- [X] T052 Run `specs/001-modular-terraform-cicd/quickstart.md` end-to-end validation locally and fix gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Phase 1; blocks all user stories
- **US1 / US2 / US3 (Phases 3–5)**: depend on Phase 2
- **Polish (Phase 6)**: depends on chosen user stories being complete

### User Story Dependencies

- **US1 (P1)**: can start after Phase 2
- **US2 (P1)**: can start after Phase 2 (independent of US1; uses GHCR)
- **US3 (P2)**: can start after Phase 2; depends on Azure subscription access and the bootstrap flow

---

## Parallel Opportunities

- Phase 2 tasks `T006` and `T007` can be implemented in parallel.
- After Phase 2 completes:
  - US1 (`T010`–`T019`) and US2 (`T020`–`T026`) can proceed in parallel.
  - US3 module tasks (`T028`–`T032`) can proceed in parallel across separate module folders.

---

## Implementation Strategy

### MVP First

1. Phase 1 → Phase 2
2. US1 (PR quality gates)
3. Validate on a PR

### Incremental Delivery

- Add US2 (artifacts) next (still no cloud deploy)
- Add US3 last (IaC review + gated apply)
