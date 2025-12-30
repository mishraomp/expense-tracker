<!--
Sync Impact Report
Version: 1.2.0 -> 1.3.0
Modified Principles:
 - I. Code Quality & Maintainability → clarified enforceable rules (typing/docs/security) and removed conflicting guidance
 - II. Test Discipline & Coverage → clarified when E2E vs unit/contract is expected
 - III. UX Consistency & Accessibility → removed PropTypes requirement (TypeScript-only) and tightened a11y gates
Added Principles:
 - V. Infrastructure, CI/CD & IaC
Modified Sections:
 - Quality Gates & Metrics → added IaC/CI gates for infra changes
 - Workflow & Review Process → clarified CI/CD enforcement and IaC review requirements
Templates Alignment:
 - .specify/templates/plan-template.md ✅ updated (removed broken commands link; improved Constitution Check guidance)
 - .specify/templates/spec-template.md ✅ verified (no changes needed)
 - .specify/templates/tasks-template.md ✅ updated (tests no longer described as optional)
 - .specify/templates/checklist-template.md ✅ verified (no changes needed)
Deferred TODOs: None
Compliance Follow-up: Next audit 2026-01-29
-->

# Expense Tracker Project Constitution

## Core Principles

### I. Code Quality & Maintainability
All committed code MUST be: (a) statically typed (TypeScript strict mode enforced in both backend and frontend; explicit return types required for all exported functions and public methods), (b) free of ESLint errors and Prettier formatting deviations, (c) organized into cohesive NestJS modules (backend) or feature-based directories (frontend) with clear public interfaces and no cyclic dependencies, (d) free of unused/dead code (remove in the same PR unless explicitly justified and tracked via a linked GitHub issue), (e) secure by construction: Prisma parameterized queries only (no raw SQL unless formally reviewed and justified), no secrets in source control, input validation using `class-validator` DTOs on all NestJS endpoints and React Hook Form validation on frontend forms, Keycloak JWT authentication enforced on protected routes, (f) documented where it matters: public APIs (NestJS controllers/services exported methods, exported hooks/utilities) MUST have sufficient doc comments to explain purpose, inputs, outputs, and edge cases.

Backend modules MUST export only necessary providers. Frontend components MUST use TypeScript types/interfaces (no PropTypes in this TypeScript-first repo). Complexity thresholds: cyclomatic complexity > 10 triggers mandatory refactor before merge unless justified in PR description with ADR reference.

Rationale: Explicit constraints reduce ambiguity, improve onboarding velocity, and keep changes reviewable.

### II. Test Discipline & Coverage
Test creation precedes implementation for all new P1 endpoints and services (TDD: write failing Vitest tests first). Testing strategy:

- Backend: unit tests via Vitest (`backend/vitest.config.ts`); contract tests in `backend/tests/contract/` for endpoint validation (status codes + response shape); integration tests for DB interactions where query behavior matters.
- Frontend: unit tests via Vitest + Testing Library for components, hooks, and utilities; Playwright E2E tests (`frontend/e2e/`) are MANDATORY for ALL features and bug fixes where a user journey could regress.

E2E vs unit/contract expectations:
- If a change impacts a user flow (navigation, auth, CRUD, forms, reporting views), add or update at least one E2E covering the flow.
- If a change is pure logic (e.g., a single service method, parser, calculator), add unit tests; add an E2E only if the logic is surfaced in the UI/API in a way that could regress.

Minimum coverage gates enforced in CI: backend lines ≥ 85%, branches ≥ 75%; frontend critical logic lines ≥ 80%. Each bug fix MUST add at least one regression test at the appropriate layer.

Builds FAIL if coverage drops below thresholds, if any test is flaky (≥2 non-deterministic failures in last 20 runs), or if any E2E test fails.

Rationale: Mandatory E2E testing catches integration issues, UI regressions, and authentication flows that unit tests cannot verify.

### III. UX Consistency & Accessibility
UI components MUST use shared design tokens and centralized state patterns: (a) Styling: Bootstrap 5 utility classes + custom Sass variables in `frontend/src/styles/theme.scss` (colors, spacing, typography); no ad hoc inline styles except dynamic D3 chart attributes or runtime-computed dimensions, (b) State management: TanStack Query for server state (expenses, incomes, categories) with centralized `queryClient` (`frontend/src/services/queryClient.ts`); Zustand store for auth state (`frontend/src/stores/auth.ts`); React Hook Form for form state, (c) Routing: TanStack Router with type-safe route definitions (`frontend/src/routes/`). Interactive elements MUST provide consistent loading states: TanStack Query `isLoading`/`isFetching` triggers skeleton or spinner within 300ms; error boundaries or `error` states display actionable messages (plain language + retry button or next step). All new UI flows MUST meet WCAG AA: color contrast ≥ 4.5:1 (verify via browser DevTools or Lighthouse), keyboard-only navigation (tab order logical, `Enter`/`Space` activate buttons/links, modals trap focus), visible focus indicators (`:focus-visible` styles in Sass). User-visible text MUST avoid jargon (e.g., "Sign in" not "Authenticate"). Navigation and layout patterns MUST reuse existing `frontend/src/components/layout/` components (Header, Sidebar, Footer); introducing a new layout component requires ADR with rationale. Chart accessibility: D3 visualizations MUST include `<title>`, `<desc>`, and ARIA labels; provide accessible data tables as fallback or export. Rationale: Leveraging Bootstrap, TanStack, and D3 conventions ensures consistent, accessible UX patterns while minimizing per-component boilerplate.

### IV. Performance & Efficiency
Performance budgets and optimization requirements: (a) Backend (NestJS): API read endpoints (GET `/api/expenses`, `/api/reports/*`) p95 latency < 400ms; write endpoints (POST/PUT/DELETE) p95 < 800ms; background jobs (CSV import processing) complete within SLA per spec (default < 5s for standard ingestion tasks). Database queries via Prisma MUST avoid N+1 (detected via query logs or `prisma.$queryRawUnsafe` analysis) and use appropriate indexes (verify via `EXPLAIN` for complex filters/sorts). No polling intervals < 30s unless justified by real-time requirement (prefer WebSocket or Server-Sent Events for live updates). (b) Frontend (Vite + React): Initial bundle (JS + CSS) MUST remain < 250KB gzipped post-build (`npm run build` in `frontend/`); route-level code splitting (`React.lazy()` + TanStack Router lazy loading) required for additions exceeding 30KB; Vite build analyzer (`vite-plugin-visualizer`) MUST be consulted before merging bundle-size PRs. Time-to-interactive (TTI) on mid-tier hardware (Chrome, 4GB RAM, throttled 4G) MUST be < 2.0s for primary dashboard (`/expenses`, `/reports`) and < 2.5s for secondary views (`/import`, `/incomes`). TanStack Query stale-time and cache-time tuned per resource (e.g., categories: `staleTime: 5min`, expenses: `staleTime: 30s`). D3 chart rendering (Income vs Expense bar, Subcategory pie) MUST complete initial render in < 500ms for datasets up to 1000 points; virtualization or pagination required beyond. (c) Memory: Memory usage growth > 10% over baseline in a PR MUST be investigated (Chrome DevTools heap snapshot comparison for frontend, Node.js `--inspect` + heap profiler for backend). Rationale: Vite's fast HMR and TanStack's intelligent caching provide foundational speed; explicit budgets prevent regressions as features scale.

### V. Infrastructure, CI/CD & IaC
Infrastructure changes MUST be reproducible, reviewable, and automated.

CI/CD (GitHub Actions):
- All PRs MUST run CI in GitHub Actions with required checks for backend + frontend (lint, tests, build).
- CI MUST use `npm ci` (not `npm install`) and MUST fail on lint/test/coverage violations.
- Secrets MUST be provided only via GitHub Actions secrets/vars; never echo secrets to logs.
- Workflow permissions MUST be least-privilege (default `contents: read`; enable elevated permissions only when required).

IaC (Terraform):
- Terraform MUST be the source of truth for provisioned resources (no manual changes without follow-up Terraform reconciliation).
- Terraform code MUST be formatted (`terraform fmt`) and validated (`terraform validate`) in CI for any IaC change.
- Remote state MUST be used for shared environments; state files MUST NOT be committed to git.
- `terraform plan` output (or a redacted summary) MUST be attached to PRs affecting infra; applies MUST be gated to protected branches/environments and require explicit approval.

Automation scripts (Bash for IaC):
- Bash scripts used for IaC automation MUST be non-interactive by default and safe for CI.
- Scripts MUST start with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Scripts MUST be ShellCheck-clean (or deviations documented with inline `shellcheck disable` and justification).

Rationale: CI/CD and IaC discipline prevents drift, improves repeatability, and reduces operational risk.

## Quality Gates & Metrics
Quality gates applied at PR merge time:

(1) Lint/format pass (ESLint + Prettier for both backend and frontend)
(2) Test coverage thresholds (Principle II: backend ≥85% lines, ≥75% branches; frontend critical logic ≥80%)
(3) Performance regression guard—any p95 increase > 10% on modified endpoints MUST be addressed
(4) Bundle size delta reported; exceedances require mitigation plan (code splitting, lazy loading, dependency audit)
(5) Accessibility spot check for new UI components (contrast, keyboard nav, focus indicators)
(6) **E2E suite pass**—ALL Playwright E2E tests (`npm run e2e:run` in `frontend/`) MUST pass; zero failures tolerated for merge
(7) **IaC/CI gates (when applicable)**—Terraform changes MUST pass `fmt` + `validate` in CI and include a reviewed plan summary

E2E tests validate critical user journeys (authentication, expense CRUD, navigation) and MUST NOT be skipped or disabled without ADR justification and linked GitHub issue for re-enablement. Metrics stored in CI artifact for audit.

## Workflow & Review Process
Workflow phases per feature: Spec → Plan → Tasks → Implementation → Review → Merge.

Every PR description MUST map changed files to affected principles (e.g., "Principle II: E2E added for expense edit flow", "Principle V: Terraform plan included and reviewed"). Reviewers MUST reject PRs lacking: test coverage updates (when logic added), performance consideration for data-heavy queries (pagination/indexing), UX rationale for new components (Bootstrap pattern reuse justification), or (when infra changes are present) evidence of CI/IaC gates.

Pre-merge checklist:
- All gates green (lint, tests, coverage, performance, accessibility)
- No TODO markers without a linked GitHub issue
- Migration scripts are idempotent with rollback notes
- Security scan (dependency vulnerabilities CVSS ≥ 7.0 blocked; run `npm audit` in both backend and frontend)
- Infrastructure (if applicable): IaC diffs are reviewed and reconciled (no manual drift)

Versioning: Semantic version for constitution (see Governance). ADR required for any exception.

## Governance
This Constitution supersedes informal practices. Amendments: Proposal PR MUST include (a) motivation, (b) impact analysis (which principles/sections affected), (c) version bump justification (MAJOR/MINOR/PATCH per semver), (d) migration or mitigation steps if removing/changing a principle. Versioning policy: MAJOR for removal or fundamental redefining of a principle; MINOR for adding a new principle or expanding measurable scope (e.g., new tech-stack constraints, new quality gate); PATCH for clarifications without changing enforcement semantics (typo fixes, wording improvements). Compliance audits monthly; non-compliance items tracked with priority based on risk (security > performance > UX > maintainability). Emergency exceptions (e.g., hotfix) allowed only if logged in an ADR within 24h. All feature plans must reference Performance Goals & Constraints consistent with Principle IV; Constitution Check section in plan MUST reflect any new metrics introduced here. Constitution amendments trigger updates to dependent templates (plan-template.md, spec-template.md, tasks-template.md) and agent files (.github/agents/*.agent.md) within same PR or follow-up PR within 3 days.

**Version**: 1.3.0 | **Ratified**: 2025-11-22 | **Last Amended**: 2025-12-29
