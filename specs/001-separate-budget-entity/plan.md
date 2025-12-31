# Implementation Plan: Separate Budget Entity

**Branch**: `001-separate-budget-entity` | **Date**: 2025-12-31 | **Spec**: specs/001-separate-budget-entity/spec.md
**Input**: Feature specification from `specs/001-separate-budget-entity/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Implementation Status: ✅ COMPLETE

All phases have been implemented:

- **Phase 1**: Setup/baseline completed
- **Phase 2**: Database migration V3.2.0 applied - `budgets` table created, legacy columns migrated and dropped
- **Phase 3 (US1)**: Backend refactored to use `budgets` table - no user-visible regressions
- **Phase 4 (US2)**: Explicit budget date ranges supported in API and UI
- **Phase 5 (US3)**: Budget overlap and precedence rules tested and verified
- **Phase 6**: Documentation updated, all tests passing (153 backend, 109 frontend)

**Key Files Added/Modified**:
- `backend/migrations/V3.2.0__separate_budget_entity.sql` - Database migration
- `backend/src/common/budgets/budget-select.ts` - Budget selection helper
- `backend/tests/unit/budget-select.spec.ts` - Budget selection tests
- Category and subcategory services, controllers, and DTOs updated
- Frontend modals updated with date range UI

## Summary

Refactor budgeting storage so Budget is a first-class entity with an explicit date-range period (start date + end date), referenced from categories and subcategories, while preserving existing user-visible functionality (existing reports, budget-aware validations, and budget report endpoints).

Approach: introduce a `budgets` table via Flyway migration, backfill from existing `categories.budget_*` and `subcategories.budget_*`, update all dependent views (notably `vw_category_budget_report`, `vw_subcategory_budget_report`), then update backend services/controllers and frontend forms/types to read/write the new budget model. Existing APIs continue to return the same shapes used by the frontend reports; any required compatibility mapping is handled in the backend.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (strict) across backend + frontend  
**Primary Dependencies**: NestJS 11 (backend), Prisma ORM 7 (backend), React 19 + TanStack Query/Router/Table (frontend), Bootstrap 5 + Sass  
**Storage**: PostgreSQL (Flyway migrations as source-of-truth; Prisma schema generated via `db pull`)  
**Testing**: Vitest 4 (backend + frontend), Playwright E2E (frontend/e2e)  
**Target Platform**: Local dev via Docker Compose (Postgres + Keycloak), Vite dev server, NestJS API server
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Keep existing endpoint/query performance within constitution budgets (read p95 < 400ms, write p95 < 800ms)  
**Constraints**:
- Data model changes MUST be Flyway migrations under `backend/migrations/` (no manual edits to `backend/prisma/schema.prisma`).
- Existing reports and endpoints MUST preserve response shape and semantics for the same date ranges.
- No raw SQL in app logic except via Prisma parameterization; DB views are managed via migrations.
**Scale/Scope**: Personal finance app with reporting views + charts; changes touch budgets in categories/subcategories, reports, and validations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates pulled from `./.specify/memory/constitution.md` (must pass; re-check after Phase 1):

- Lint/format: ESLint + Prettier pass (backend + frontend).
- Tests: Vitest unit tests and contract tests updated; backend coverage ≥ 85% lines and ≥ 75% branches; frontend critical logic ≥ 80%.
- E2E: Playwright E2E updated/added for any impacted user journeys (category edit budget, subcategory budget edit, report pages).
- DB safety: Prisma parameterized queries only; views/MVs updated only via Flyway SQL migrations.
- Accessibility: Budget period inputs remain labeled and keyboard accessible; no inline styles except allowed dynamic values.
- Performance: Budget report queries and `getBudgetVsActual` remain within existing perf expectations; add/adjust indexes if needed.
- IaC/CI: N/A (no Terraform or GitHub Actions changes expected).

## Project Structure

### Documentation (this feature)

```text
specs/001-separate-budget-entity/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── src/
│   ├── modules/
│   ├── prisma/
│   └── common/
├── migrations/
├── prisma/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── stores/
│   └── styles/
├── tests/
└── e2e/
```

**Structure Decision**: Web application structure using `backend/` and `frontend/` as shown above.

## Phase 0 — Research

Output: `specs/001-separate-budget-entity/research.md`

- Confirm all current budget touchpoints (migrations, views, backend services, frontend forms, tests).
- Decide semantics for date-range budgets, overlap handling, and legacy compatibility.

### Legacy Compatibility Reconciliation (T003)

**Decision**: Use wide-range backfill + derive `budget_period` in views for full backward compatibility.

- **Backfill approach**: Existing budgets are migrated with `start_date = 1970-01-01` and `end_date = 9999-12-31` so they apply to all historical and future queries.
- **View compatibility**: Views continue to output `budget_period` by deriving it from the new `budgets.start_date/end_date`:
  - If range matches exactly one calendar month → `'monthly'`
  - If range matches exactly one calendar year → `'annual'`
  - If range is wide (1970-01-01 to 9999-12-31) → `NULL` (legacy recurring)
  - Otherwise → `NULL`
- **Output schema unchanged**: Views keep returning `budget_amount`, `budget_period`, `period_start`, `period_end`, etc.
- **Frontend impact**: None — API shapes remain stable.

## Phase 1 — Design & Contracts

Outputs:

- `specs/001-separate-budget-entity/data-model.md`
- `specs/001-separate-budget-entity/contracts/openapi.budgets.yaml`
- `specs/001-separate-budget-entity/quickstart.md`

Design targets:

- Budget is a separate DB entity with `start_date` and `end_date` (inclusive).
- Default UI period is Jan 1 → Dec 31 of the current year (yearly default) while still allowing arbitrary ranges.
- Existing budget report endpoints keep returning the same columns used by the frontend report tables.

## Phase 2 — Implementation Plan (Detailed)

### 2.1 Database (Flyway) — schema + backfill

Create a new Flyway migration (next version after `V3.1.2`), e.g. `V3.2.0__separate_budget_entity.sql`:

- Create `budgets` table with:
  - `id` UUID PK
  - `amount` numeric(12,2) NOT NULL
  - `start_date` date NOT NULL
  - `end_date` date NOT NULL
  - `category_id` uuid NULL
  - `subcategory_id` uuid NULL
  - `user_id` uuid NULL
  - `created_at`, `updated_at`
- Add constraints:
  - `start_date <= end_date`
  - exactly one of `category_id` / `subcategory_id` set
- Backfill budgets from legacy columns:
  - From `categories` where `budget_amount IS NOT NULL`
  - From `subcategories` where `budget_amount IS NOT NULL`
  - Use wide range for legacy compatibility: `1970-01-01` → `9999-12-31`
- Update views to read from `budgets` instead of legacy columns:
  - `vw_category_budget_report`
  - `vw_subcategory_budget_report`
- Inspect all other views/materialized views and update if they reference `budget_amount` / `budget_period`.
- After successful backfill + view update:
  - Drop legacy columns from `categories` and `subcategories`.
  - Drop legacy enum type `budget_period`.

Indexing:

- Add indexes to support report queries and active-budget lookups.
- Re-check existing expense indexes from `V2.3.0__reporting_views.sql` remain valid.

### 2.2 Prisma (generated schema) workflow

- Apply migration via Docker/Flyway.
- Run `npx prisma db pull` and `npx prisma generate`.
- Do not hand-edit `backend/prisma/schema.prisma`.

### 2.3 Backend updates

Budget sourcing changes (preserve precedence):

- Replace reads of `Category.budgetAmount/budgetPeriod` and `Subcategory.budgetAmount/budgetPeriod` with a query against `budgets`:
  - For a given category/subcategory and target date (or report range), select the active budget using the overlap rule.
  - Preserve precedence: subcategory budget overrides category budget.

Key locations:

- `ReportsService.getBudgetVsActual`:
  - Compute a monthly budget amount from budgets active in the queried range.
  - Preserve existing behavior for legacy budgets by treating wide-range budgets as always-active.
- `ExpensesService.calculateTotals`:
  - Replace legacy budget fields with a lookup for the relevant date filter.
- Category/subcategory create/update endpoints:
  - Update to write budgets as rows in `budgets` (create/update semantics).
  - Default date range when setting a budget: Jan 1 → Dec 31 of the current year.
- Report endpoints that query the DB views:
  - Keep response mapping stable.

Compatibility:

- Where response types still include `budgetPeriod`, derive `monthly`/`annual` only when the budget range aligns exactly to a calendar month/year; otherwise return `null`.

### 2.4 Frontend updates

- Update category edit modal and category create modal to allow editing budget date range (start/end) with defaults.
- Update subcategory manager to support budget date range.
- Update shared types to represent budgets as `amount + startDate + endDate` (keep display compatible for reports).
- Ensure forms remain accessible (labels, keyboard navigation) and avoid inline styles.

### 2.5 Tests (must satisfy constitution)

Backend:

- Update/add unit tests for:
  - Budget selection precedence (subcategory over category)
  - Overlap resolution (most recently updated)
  - `getBudgetVsActual` monthly budget computation from date-range budgets
- Update contract tests for reports if response shape changes.

Frontend:

- Update/add unit tests for budget form behaviors (default dates, validation start<=end).
- Add/update Playwright E2E covering:
  - Editing a category budget with date range
  - Editing a subcategory budget with date range
  - Loading budget-related reports

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations are expected for this feature.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
