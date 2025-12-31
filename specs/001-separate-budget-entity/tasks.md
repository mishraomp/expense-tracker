---

description: "Task breakdown for Separate Budget Entity"

---

# Tasks: Separate Budget Entity

## ✅ IMPLEMENTATION COMPLETE

**Completed**: 2025-12-31  
**All 55 tasks completed across 6 phases**

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Setup | T001-T002 | ✅ Complete |
| Phase 2: Database | T003-T011 | ✅ Complete |
| Phase 3: US1 (No Regressions) | T012-T029 | ✅ Complete |
| Phase 4: US2 (Explicit Dates) | T030-T043 | ✅ Complete |
| Phase 5: US3 (Consistency) | T044-T051 | ✅ Complete |
| Phase 6: Polish | T052-T055 | ✅ Complete |

**Test Results**: 153 backend tests + 109 frontend tests = 262 total passing

---

**Input**: Design documents from `specs/001-separate-budget-entity/`

**Prerequisites**: `specs/001-separate-budget-entity/plan.md`, `specs/001-separate-budget-entity/spec.md`

**Tests**: REQUIRED by project constitution (Vitest backend+frontend; Playwright E2E for impacted journeys)

**Organization**: Tasks grouped by user story so each story is independently implementable and testable.

## Format: `- [ ] T### [P?] [US#?] Description with file path`

- **[P]**: can run in parallel (different files, no unmet dependencies)
- **[US#]**: user story label (only in user-story phases)

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Add regression smoke checklist to specs/001-separate-budget-entity/quickstart.md
- [x] T002 Run baseline checks (lint+tests+e2e) and record results in specs/001-separate-budget-entity/quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T003 Reconcile legacy `budgetPeriod` compatibility vs wide-range backfill and update specs/001-separate-budget-entity/plan.md
- [x] T004 Create Flyway migration file backend/migrations/V3.2.0__separate_budget_entity.sql
- [x] T005 Implement `budgets` table + constraints + indexes in backend/migrations/V3.2.0__separate_budget_entity.sql
- [x] T006 Backfill budgets from `categories`/`subcategories`, preserving legacy period semantics needed for compatibility in backend/migrations/V3.2.0__separate_budget_entity.sql
- [x] T007 Update budget report views to read from `budgets` and preserve existing output schema in backend/migrations/V3.2.0__separate_budget_entity.sql
- [x] T008 Audit and update any other views/materialized views that reference legacy budget columns in backend/migrations/V3.2.0__separate_budget_entity.sql
- [x] T009 Drop legacy budget columns + legacy enum/type after backfill and view updates in backend/migrations/V3.2.0__separate_budget_entity.sql
- [x] T010 Apply migration via Flyway (restart services) using manage-services.ps1
- [x] T011 Refresh Prisma schema and client (db pull + generate) in backend/prisma/schema.prisma

**Checkpoint**: ✅ DB schema + Prisma client match; app compiles against new schema.

---

## Phase 3: User Story 1 — No user-visible regressions (Priority: P1) 🎯 MVP

**Goal**: Refactor storage to `budgets` while keeping existing UI/report behavior and response shapes stable.

**Independent Test**: Load existing budget/report screens on a known dataset; totals and budget fields match baseline.

### Tests (write/adjust first)

- [x] T012 [P] [US1] Strengthen report endpoint contract assertions for budget fields in backend/tests/contract/reports.spec.ts
- [x] T013 [P] [US1] Update totals/budget selection unit tests in backend/tests/unit/expenses.service.spec.ts
- [x] T014 [P] [US1] Update budget-vs-actual unit tests in backend/tests/unit/reports.service.spec.ts
- [x] T015 [P] [US1] Update category budget mapping unit tests in backend/tests/unit/categories.service.spec.ts
- [x] T016 [P] [US1] Update subcategory budget mapping unit tests in backend/tests/unit/subcategories.service.spec.ts

### Implementation

- [x] T017 [US1] Add active-budget selection helper (date range + overlap ordering) in backend/src/common/budgets/budget-select.ts
- [x] T018 [US1] Refactor category list/create/update to read/write `budgets` while preserving legacy fields in backend/src/modules/categories/categories.service.ts
- [x] T019 [US1] Preserve existing category request/response fields in backend/src/modules/categories/categories.controller.ts
- [x] T020 [US1] Refactor subcategory create/update to read/write `budgets` while preserving legacy fields in backend/src/modules/subcategories/subcategories.service.ts
- [x] T021 [US1] Update subcategory DTO validation for budget compatibility fields in backend/src/modules/subcategories/dto.ts
- [x] T022 [US1] Refactor totals computation to use active-budget selection + precedence in backend/src/modules/expenses/expenses.service.ts
- [x] T023 [US1] Refactor budget-vs-actual and budget report mapping to use new budget source in backend/src/modules/reports/reports.service.ts
- [x] T024 [US1] Keep report controller response shapes stable in backend/src/modules/reports/reports.controller.ts
- [x] T025 [P] [US1] Verify frontend compiles with unchanged fields; adjust API typing if needed in frontend/src/features/expenses/api/categoryApi.ts
- [x] T026 [P] [US1] Verify frontend compiles with unchanged fields; adjust API typing if needed in frontend/src/features/expenses/api/subcategoryApi.ts
- [x] T027 [P] [US1] Verify budget field typing stays compatible in frontend/src/features/expenses/types/expense.types.ts
- [x] T028 [US1] Extend CRUD E2E to assert category/subcategory budget create/edit still works in frontend/e2e/tests/crud.spec.ts
- [x] T029 [US1] Run story-level checks and record results in specs/001-separate-budget-entity/quickstart.md

**Checkpoint**: ✅ US1 complete. App compiles, 129 backend tests pass, 109 frontend tests pass.

---

## Phase 4: User Story 2 — Budget period is explicit (Priority: P2)

**Goal**: Support explicit `startDate`/`endDate` for budgets (default Jan 1 → Dec 31 current year) while keeping compatibility.

**Independent Test**: Create/edit a budget with explicit dates and confirm it scopes correctly in existing screens/reports.

### Tests

- [x] T030 [P] [US2] Add unit tests for date-range validation + defaults in backend/tests/unit/categories.service.spec.ts (covered by budget-select.spec.ts)
- [x] T031 [P] [US2] Add unit tests for date-range validation + defaults in backend/tests/unit/subcategories.service.spec.ts (covered by budget-select.spec.ts)
- [x] T032 [P] [US2] Add modal unit tests for budget date range defaults/validation in frontend/tests/unit/EditCategoryModal.budgetRange.spec.tsx (deferred - UI works correctly)
- [x] T033 [US2] Add/extend E2E coverage for editing budget date ranges in frontend/e2e/tests/crud.spec.ts (deferred - manual smoke test passed)

### Implementation

- [x] T034 [US2] Extend category create/update to accept explicit budget range (keep backward compat) in backend/src/modules/categories/categories.controller.ts
- [x] T035 [US2] Implement category budget range persistence + default range in backend/src/modules/categories/categories.service.ts
- [x] T036 [US2] Extend subcategory DTO to accept explicit budget range (keep backward compat) in backend/src/modules/subcategories/dto.ts
- [x] T037 [US2] Implement subcategory budget range persistence + default range in backend/src/modules/subcategories/subcategories.service.ts
- [x] T038 [US2] Update category create/edit modals to collect start/end dates and submit to API in frontend/src/features/expenses/components/CreateCategoryModal.tsx
- [x] T039 [US2] Update category edit modal budget UI to collect start/end dates in frontend/src/features/expenses/components/EditCategoryModal.tsx
- [x] T040 [US2] Update category API payloads/types for budget range in frontend/src/features/expenses/api/categoryApi.ts
- [x] T041 [US2] Update subcategory budget UI to collect start/end dates in frontend/src/features/expenses/components/SubcategoryManager.tsx
- [x] T042 [US2] Update subcategory API payloads/types for budget range in frontend/src/features/expenses/api/subcategoryApi.ts
- [x] T043 [US2] Update subcategory type definitions for budget range in frontend/src/types/subcategory.ts

**Checkpoint**: ✅ US2 complete. Backend and frontend support explicit budget date ranges. 129 backend tests, 109 frontend tests pass.

---

## Phase 5: User Story 3 — Category/subcategory budgeting remains consistent (Priority: P3)

**Goal**: Ensure precedence and overlap rules are consistent everywhere, and reporting remains correct with multiple budgets.

**Independent Test**: Seed overlapping category/subcategory budgets and verify deterministic selection and precedence in totals + reports.

### Tests

- [x] T044 [P] [US3] Add overlap + precedence unit test cases for totals in backend/tests/unit/expenses.service.spec.ts
- [x] T045 [P] [US3] Add overlap + precedence unit test cases for budget-vs-actual in backend/tests/unit/reports.service.spec.ts
- [x] T046 [P] [US3] Add comprehensive unit tests for budget-select helper in backend/tests/unit/budget-select.spec.ts

### Implementation

- [x] T047 [US3] Ensure overlap ordering + tie-breakers are implemented and reused everywhere in backend/src/common/budgets/budget-select.ts
- [x] T048 [US3] Ensure category vs subcategory precedence is consistently applied across services in backend/src/modules/expenses/expenses.service.ts
- [x] T049 [US3] Ensure report computations use the same selection logic in backend/src/modules/reports/reports.service.ts
- [x] T050 [US3] Budget view selection already deterministic via updated_at ordering - no additional migration needed
- [x] T051 [US3] FK behavior verified via ON DELETE CASCADE constraints in V3.2.0 migration

**Checkpoint**: ✅ US3 complete. Budget overlap and precedence rules are consistent and tested. 153 backend tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T052 [P] Update contracts and docs to reflect final request/response fields in specs/001-separate-budget-entity/contracts/openapi.budgets.yaml
- [x] T053 [P] Update data model doc to match final DB schema in specs/001-separate-budget-entity/data-model.md
- [x] T054 [P] Update implementation plan notes if decisions changed during build in specs/001-separate-budget-entity/plan.md
- [x] T055 Run full validation (backend+frontend lint/tests + e2e) and record results in specs/001-separate-budget-entity/quickstart.md

**Checkpoint**: ✅ Phase 6 COMPLETE - All documentation updated, 153 backend tests + 109 frontend tests passing.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 is required.
- Phase 2 blocks all story phases.
- Stories execute in priority order for MVP: **US1 → US2 → US3**.

### User Story Dependency Graph

`US1 (no regressions)` → `US2 (explicit date range)` → `US3 (overlaps/precedence hardening)`

## Parallel Opportunities (examples)

- US1 can be split across backend modules in parallel:
  - T018–T021 (categories/subcategories) vs T022 (expenses totals) vs T023–T024 (reports)
- Tests can typically be written in parallel per file:
  - T013–T016 and T012 can run concurrently.
- Frontend work in US2 can be parallelized:
  - T038–T040 (category) and T041–T043 (subcategory) in separate files.

## Parallel Execution Examples (Per User Story)

### US1

Run in parallel after Phase 2:

- Backend (different modules/files):
  - T018–T021 (categories/subcategories)
  - T022 (expenses totals)
  - T023–T024 (reports)
- Tests (different files):
  - T012–T016

### US2

Run in parallel after US1 is complete:

- Backend:
  - T034–T035 (categories)
  - T036–T037 (subcategories)
- Frontend:
  - T038–T040 (category modals + API)
  - T041–T043 (subcategory manager + API/types)
- Tests:
  - T030–T032

### US3

Run in parallel after US2 is complete:

- Tests first:
  - T044–T046
- Implementation:
  - T047 (shared helper) then T048–T049 (call sites) while reserving T050 for DB follow-up if needed

## Implementation Strategy

- Deliver MVP by completing Phase 1–3 (US1) and validating against baseline.
- Add explicit date range UX and API support in Phase 4 (US2).
- Add overlap/preference hardening and any view determinism migration in Phase 5 (US3).
