# Phase 0 — Research: Separate Budget Entity

## Current State (Repo Findings)

### Where budgets live today

- Storage: budgets are stored as nullable columns on both `categories` and `subcategories`:
  - `budget_amount` (numeric)
  - `budget_period` (PostgreSQL enum `budget_period` with values `monthly` | `annual`)
- Migration: [backend/migrations/V2.1.0__budgets.sql](../../backend/migrations/V2.1.0__budgets.sql)

### Where budgets are consumed today

- Backend runtime logic:
  - Budget precedence and monthly-budget normalization in `ReportsService.getBudgetVsActual`.
  - Budget lookup (subcategory first, then category) in `ExpensesService.calculateTotals`.
- Reporting views:
  - `vw_category_budget_report` and `vw_subcategory_budget_report` compute `period_start/period_end` based on `budget_period` and expense dates.
  - Migration: [backend/migrations/V2.3.0__reporting_views.sql](../../backend/migrations/V2.3.0__reporting_views.sql)
- Frontend:
  - Category and subcategory edit flows use `budgetAmount` + `budgetPeriod`.
  - Reports pages consume `budget_amount`, `budget_period`, `period_start`, `period_end` from the budget report endpoints.

## Key Unknowns → Decisions

### Decision 1: What does “budget period” mean after the refactor?

- **Chosen**: A budget’s period is an explicit inclusive date range: `start_date` and `end_date` (both required).
- **Rationale**: Matches the new requirement (user-provided start/end for flexibility) and enables arbitrary periods.
- **Default**: For new budgets created via the UI, default to **Jan 1 → Dec 31 of the current year** (yearly budget default).
- **Alternative considered**: Keep `monthly`/`annual` recurrence semantics.
  - **Rejected because** requirement explicitly moves to date range (start/end).

### Decision 2: How are budgets related to categories/subcategories?

- **Chosen**: Budgets are stored in a new `budgets` table with **either** `category_id` **or** `subcategory_id` (exactly one), and budgets are “referenced” from categories/subcategories via these foreign keys.
- **Rationale**: Supports multiple budgets over time for a category/subcategory and keeps the budget entity independent.
- **Alternative considered**: Put `budget_id` on `categories` and `subcategories`.
  - **Rejected because** it only supports a single budget per entity and complicates historical/period-specific budgets.

### Decision 3: How to handle overlapping budgets?

- **Chosen**: Deterministic selection rule: when multiple budgets match the same date and entity, the **most recently updated** budget is the active budget.
- **Rationale**: Matches the spec’s deterministic requirement and avoids heavy database exclusion constraints.
- **Alternative considered**: Prohibit overlaps with an exclusion constraint.
  - **Rejected because** it adds complexity and can be hard to migrate safely.

### Decision 4: How to preserve existing user-visible behavior during migration?

- **Chosen**: Backfill existing budgets into the new table with a wide effective range so existing reports and calculations keep working for historical date ranges.
  - Migration creates budgets with `start_date = DATE '1970-01-01'` and `end_date = DATE '9999-12-31'` when converting from the legacy `budget_period` columns.
- **Rationale**: The legacy model behaved like a recurring budget that applied across all years; a wide range approximates that behavior while still using explicit dates.
- **Alternative considered**: Use the current year’s Jan–Dec period for migrated budgets.
  - **Rejected because** it would break historical report queries for past/future years.

### Decision 5: What happens to legacy columns and enum?

- **Chosen**: After successful backfill and view updates, drop `categories.budget_amount`, `categories.budget_period`, `subcategories.budget_amount`, `subcategories.budget_period`, and drop the `budget_period` enum type.
- **Rationale**: Enforces the new model and prevents drift.

## Compatibility Notes

- The backend and views must continue returning the same columns expected by the current frontend report tables (`budget_amount`, `budget_period`, `period_start`, `period_end`, etc.).
- Where the legacy `budget_period` is no longer a stored enum, it will be derived:
  - If `start_date`/`end_date` correspond exactly to a calendar month, return `monthly`.
  - If they correspond exactly to a calendar year, return `annual`.
  - Otherwise return `NULL` (or a product decision if we later want a new enum value).

## Risks & Mitigations

- **Risk**: View semantics change (grouping by month/year vs budget range).
  - **Mitigation**: Keep view schema stable and make grouping compatible with existing report usage; add tests validating sample outputs.
- **Risk**: Regression in budget validation/remaining budget in expense UI.
  - **Mitigation**: Update budget lookup logic to pick the active budget for the expense date range; add unit + E2E coverage.
- **Risk**: Prisma schema drift.
  - **Mitigation**: Follow mandatory workflow: Flyway migration → Docker start → `prisma db pull` → `prisma generate`.
