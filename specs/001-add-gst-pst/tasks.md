# Task Breakdown: Add GST and PST taxes to expenses and line items

**Feature**: 001-add-gst-pst  
**Branch**: `001-add-gst-pst`  
**Date Generated**: 2025-12-14  
**Total Tasks**: 24  
**Estimated Duration**: 5-7 days (full-stack feature with comprehensive tests)

---

## Overview

This document breaks down the GST/PST tax feature into granular, actionable implementation tasks organized by user story and phase. Each task is independently testable and includes file paths and acceptance criteria.

**Key Design**: Checkbox-based applicability flags with system-wide default rates (no manual rate entry per record). Backend applies defaults automatically; frontend shows calculated amounts.

---

## Task Organization

- **Phase 1**: Setup & Database (blockers for all downstream work)
- **Phase 2**: Backend Infrastructure & Services (blocking for API contracts)
- **Phase 3**: User Story 1 - Expense-level taxes (P1, core feature)
- **Phase 4**: User Story 2 - Line-item taxes (P2, extends US1)
- **Phase 5**: User Story 3 - CSV import/export (P3, reporting)
- **Phase 6**: Quality Assurance & Polish (E2E, coverage, gates)

---

## Phase 1: Setup & Database

### T001 - Create Flyway migration V3.0.0

- [ ] T001 Create database migration file `backend/migrations/V3.0.0__add_gst_pst_taxes.sql`

**Description**: Create Flyway SQL migration to add tax-related tables and columns.

**Acceptance Criteria**:
- [ ] `tax_defaults` table created with columns: `id (UUID)`, `gst_rate (NUMERIC(5,2))`, `pst_rate (NUMERIC(5,2))`, `is_default (BOOLEAN)`, `region (VARCHAR(10) NULL)`, `user_id (UUID NULL)`, `created_at`, `updated_at`
- [ ] Unique index on `(is_default)` WHERE `is_default = true` (only one default allowed)
- [ ] Foreign key `user_id` → `users(id)` with ON DELETE CASCADE
- [ ] Initial data inserted: `gst_rate=5.00, pst_rate=7.00, is_default=true` (Canada defaults)
- [ ] `expenses` table altered: add columns `gst_applicable (BOOLEAN DEFAULT false)`, `pst_applicable (BOOLEAN DEFAULT false)`, `gst_amount (NUMERIC(12,2) DEFAULT 0)`, `pst_amount (NUMERIC(12,2) DEFAULT 0)`
- [ ] Constraints added to `expenses`: check `gst_amount >= -999999.99 AND gst_amount <= 999999.99` (and same for pst_amount)
- [ ] Indexes created: `idx_expenses_gst_applicable`, `idx_expenses_pst_applicable` for filtering
- [ ] `expense_items` table altered: same 4 columns + same constraints and indexes
- [ ] Migration runs without errors: `npm run start:dev` in backend starts without rollback
- [ ] Rollback works: `npx prisma migrate resolve --rolled-back V3.0.0__add_gst_pst_taxes` succeeds

**File Path**: `backend/migrations/V3.0.0__add_gst_pst_taxes.sql`

**Test**: Manual execution in local DB; verify columns exist and data persists after restart.

---

### T002 - Update Prisma schema with new entities and fields

- [ ] T002 Update Prisma schema and regenerate client in `backend/prisma/schema.prisma`

**Description**: Add TaxDefaults model and extend Expense/ExpenseItem models with tax fields.

**Acceptance Criteria**:
- [ ] New `TaxDefaults` model added with fields: `id`, `gstRate`, `pstRate`, `isDefault`, `region`, `userId`, `createdAt`, `updatedAt`
- [ ] Relation added to User: `user User? @relation(...)`
- [ ] Unique constraint: `@@unique([isDefault], where: { isDefault: true })`
- [ ] `Expense` model extended: add `gstApplicable`, `pstApplicable`, `gstAmount`, `pstAmount`
- [ ] `ExpenseItem` model extended: same 4 fields
- [ ] All numeric fields map to `@db.Numeric(...)` with correct precision
- [ ] `npm run prisma:generate` succeeds and updates `node_modules/.prisma/client/`
- [ ] TypeScript types regenerated without errors in `backend/src/`
- [ ] No cyclic dependencies in generated Prisma client

**File Paths**: `backend/prisma/schema.prisma`

**Test**: `npm run prisma:generate` succeeds; `npx prisma studio` connects and shows new columns.

---

## Phase 2: Backend Infrastructure & Services

### T003 - Create TaxCalculationService

- [ ] T003 Implement tax calculation logic in `backend/src/modules/expenses/services/tax-calculation.service.ts`

**Description**: Core service for computing tax amounts from applicability flags and system defaults.

**Acceptance Criteria**:
- [ ] Service class created with method `calculateExpenseTaxes(expense: Expense, lines?: ExpenseItem[]): Promise<Expense>`
- [ ] Fetches system default rates from `TaxDefaults` where `isDefault = true`
- [ ] For each tax flag (`gstApplicable`, `pstApplicable`): if true, calculates amount as `subtotal * (rate / 100)`, else 0
- [ ] When lines exist: aggregates line amounts to expense level (sum of all line `gst_amount` values)
- [ ] When no lines: expense taxes computed directly from expense subtotal and flags
- [ ] Rounding: final expense total rounded to 2 decimals via `Math.round(total * 100) / 100`
- [ ] Line-level amounts kept exact (not rounded) for accurate aggregation
- [ ] Handles edge cases: zero amounts, refunds (negative), null rates
- [ ] JSDoc comments document all parameters and return types
- [ ] Error handling: throws descriptive error if TaxDefaults lookup fails
- [ ] Unit testable: pure function signature (receives data, returns computed totals)

**File Path**: `backend/src/modules/expenses/services/tax-calculation.service.ts`

**Test**: Unit test with multiple scenarios (zero tax, default tax, line aggregation).

---

### T004 - Create/update ExpenseDto classes with tax fields

- [ ] T004 [P] Implement DTOs in `backend/src/modules/expenses/dto/`

**Description**: Add tax field definitions to request/response DTOs for expenses and line items.

**Acceptance Criteria**:
- [ ] `CreateExpenseDto`: add optional `gstApplicable?: boolean = false`, `pstApplicable?: boolean = false` fields
- [ ] `UpdateExpenseDto`: same optional fields (allow toggling taxes on existing expenses)
- [ ] `ExpenseResponseDto`: include `gstApplicable`, `pstApplicable` (echoed from request), `gstRate` (read-only, from system defaults), `gstAmount` (read-only, computed), `pstRate`, `pstAmount`, `totalTaxAmount` (sum of taxes)
- [ ] `CreateExpenseLineDto`: same `gstApplicable`, `pstApplicable` boolean fields
- [ ] `ExpenseLineResponseDto`: same response fields as expense
- [ ] All boolean fields validated with `@IsBoolean()` decorator
- [ ] All amount/rate fields validated with `@IsDecimal()` where applicable
- [ ] Transformation: convert camelCase (API) to snake_case (DB) using `@Transform()`
- [ ] No `gstRate` or `pstRate` input fields allowed (read-only; computed from defaults)

**File Paths**: 
- `backend/src/modules/expenses/dto/create-expense.dto.ts`
- `backend/src/modules/expenses/dto/update-expense.dto.ts`
- `backend/src/modules/expenses/dto/expense-response.dto.ts`
- `backend/src/modules/expenses/dto/create-expense-line.dto.ts`
- `backend/src/modules/expenses/dto/expense-line-response.dto.ts`

**Test**: Manual DTO validation with invalid input (non-boolean flags) fails validation.

---

### T005 - Update ExpensesService with tax calculation logic

- [ ] T005 [P] Integrate tax calculations in `backend/src/modules/expenses/expenses.service.ts`

**Description**: Inject TaxCalculationService into ExpensesService; call on create/update to compute and persist tax amounts.

**Acceptance Criteria**:
- [ ] Constructor: inject `TaxCalculationService` via dependency injection
- [ ] `create()` method: after creating expense, call `taxCalcService.calculateExpenseTaxes(expense, [])`, persist computed amounts
- [ ] `update()` method: same as create (recompute if flags or amount changed)
- [ ] `findOne()` method: include line items in query (leftJoinAndSelect or relation eager loading) so `calculateExpenseTaxes()` can aggregate
- [ ] When fetching expenses for list/detail: include `gstAmount`, `pstAmount`, `total` (computed or persisted)
- [ ] Transaction scope: ensure tax calculation and persistence are atomic (Prisma transaction if needed)
- [ ] Error handling: if tax calculation fails, rollback save and return 500 with clear error message
- [ ] No N+1 queries: fetch all line items in single query, not loop per expense

**File Path**: `backend/src/modules/expenses/expenses.service.ts`

**Test**: Create expense with `gstApplicable=true`; verify `gstAmount` is persisted correctly.

---

## Phase 3: User Story 1 - Expense-level Taxes (P1)

### T006 - Unit tests for tax calculation

- [ ] T006 Write unit tests for TaxCalculationService in `backend/tests/unit/expenses/tax-calculation.spec.ts`

**Description**: Comprehensive unit tests for tax calculation logic (checkbox → amount mapping).

**Acceptance Criteria**:
- [ ] Test: `gstApplicable=true, pstApplicable=false` → `gstAmount=5, pstAmount=0` (for 100 base)
- [ ] Test: `gstApplicable=false, pstApplicable=true` → `gstAmount=0, pstAmount=7`
- [ ] Test: `gstApplicable=true, pstApplicable=true` → `gstAmount=5, pstAmount=7, total=112`
- [ ] Test: both false → `gstAmount=0, pstAmount=0, total=100` (tax-exempt)
- [ ] Test: negative amount (refund) → taxes also negative (e.g., `gstAmount=-5`)
- [ ] Test: system default rate fetch succeeds
- [ ] Test: system default rate fetch fails → throws error with clear message
- [ ] Test: zero subtotal → zero taxes regardless of flags
- [ ] Coverage: ≥95% lines and branches for TaxCalculationService

**File Path**: `backend/tests/unit/expenses/tax-calculation.spec.ts`

**Test**: `npm run test -- tax-calculation.spec.ts` all pass; coverage report ≥95%.

---

### T007 - Contract tests for expense tax endpoints

- [ ] T007 [P] Write contract tests in `backend/tests/contract/expenses.tax.spec.ts`

**Description**: API-level tests for expense create/update/read with tax fields.

**Acceptance Criteria**:
- [ ] Test POST `/expenses` with `gstApplicable=true`: response includes `gstRate`, `gstAmount`, `total` correctly computed
- [ ] Test POST `/expenses` with both flags false: response has zero tax amounts
- [ ] Test PUT `/expenses/:id` to toggle flags: previous request, then update, verify recalculated
- [ ] Test GET `/expenses/:id`: response includes all tax fields
- [ ] Validate response schema: all tax fields present with correct types (boolean flags, decimal amounts)
- [ ] Error case: invalid flag type (string instead of boolean) → 400 with validation error
- [ ] Error case: missing required fields → 400
- [ ] Verify persisted data: create expense, fetch from DB directly, confirm amounts match API response

**File Path**: `backend/tests/contract/expenses.tax.spec.ts`

**Test**: `npm run test -- expenses.tax.spec.ts` all pass; API contract validated.

---

### T008 - Update ExpensesController with tax field documentation

- [ ] T008 Update Swagger/API docs in `backend/src/modules/expenses/expenses.controller.ts`

**Description**: Add JSDoc and Swagger decorators for tax field documentation.

**Acceptance Criteria**:
- [ ] `@Post('/')` endpoint: JSDoc includes note about tax flags and automatic calculation
- [ ] `@ApiBody()` decorator: includes example request with `gstApplicable`/`pstApplicable`
- [ ] `@ApiResponse(201)` decorator: includes example response with computed `gstAmount`/`pstAmount`
- [ ] `@Put('/:id')` endpoint: same documentation updates
- [ ] Swagger UI (http://localhost:3000/api) shows tax field examples
- [ ] Tax calculation behavior documented in JSDoc (e.g., "amounts computed from system defaults")

**File Path**: `backend/src/modules/expenses/expenses.controller.ts`

**Test**: `npm run start:dev` and verify Swagger renders tax field examples.

---

### T009 - Frontend: Add tax type definitions

- [ ] T009 [P] Update Expense types in `frontend/src/types/expense.ts`

**Description**: Add tax-related TypeScript types and API response fields.

**Acceptance Criteria**:
- [ ] `Expense` interface: add `gstApplicable?: boolean`, `pstApplicable?: boolean`, `gstAmount?: number`, `pstAmount?: number`, `gstRate?: number | null`, `pstRate?: number | null`, `totalTaxAmount?: number`
- [ ] Same fields added to `ExpenseLineItem` interface
- [ ] Fields marked optional (`?`) to maintain backward compatibility with existing API responses
- [ ] TypeScript strict mode: all usages type-checked
- [ ] No `any` types used for tax fields

**File Path**: `frontend/src/types/expense.ts`

**Test**: `npm run lint` in frontend succeeds (no type errors).

---

### T010 - Frontend: Update ExpensesApi service

- [ ] T010 [P] Update API service in `frontend/src/services/ExpensesApi.ts`

**Description**: Update API client to send/receive tax fields.

**Acceptance Criteria**:
- [ ] `createExpense()` method: accepts optional `gstApplicable`/`pstApplicable` in payload
- [ ] `updateExpense()` method: same optional fields for toggling taxes
- [ ] Response DTO includes all tax response fields
- [ ] No client-side tax calculation (all amounts come from backend)
- [ ] TanStack Query hooks (useCreateExpense, useUpdateExpense, useExpense) properly type tax fields
- [ ] Error handling: API 500 on tax calculation failure → client error message to user

**File Path**: `frontend/src/services/ExpensesApi.ts`

**Test**: `npm run lint` succeeds; API call payload validated in contract test.

---

### T011 - Frontend: Update ExpenseForm component with tax checkboxes

- [ ] T011 [US1] Update form component in `frontend/src/features/expenses/components/ExpenseForm.tsx`

**Description**: Add checkboxes for "Apply GST" and "Apply PST"; display calculated amounts.

**Acceptance Criteria**:
- [ ] Add `<input type="checkbox" label="Apply GST" />` field bound to `gstApplicable` state
- [ ] Add `<input type="checkbox" label="Apply PST" />` field bound to `pstApplicable` state
- [ ] On toggle or amount change: show calculated `gstAmount`, `pstAmount`, and `total` (display-only fields, computed from defaults)
- [ ] Calculation shown immediately in UI (no server round-trip for preview)
- [ ] Use Bootstrap form utilities (no inline styles; use `frontend/src/styles/theme.scss` utilities)
- [ ] Use `rem` units for spacing/sizing (responsive)
- [ ] Styling: checkboxes use `form-check` Bootstrap class, labels use `form-check-label`
- [ ] Accessibility: checkboxes have ARIA labels and are keyboard navigable
- [ ] Form submission: payload includes boolean flags; no rate fields sent
- [ ] Edit existing expense: form pre-populates checkbox state and displays current amounts

**File Path**: `frontend/src/features/expenses/components/ExpenseForm.tsx`

**Test**: Manual UI test: toggle checkbox, verify display updates; save expense, verify API payload.

---

### T012 - Frontend: Unit test ExpenseForm with tax logic

- [ ] T012 [US1] Write component tests in `frontend/tests/unit/features/expenses/ExpenseForm.spec.tsx`

**Description**: Test checkbox behavior and display calculations in ExpenseForm.

**Acceptance Criteria**:
- [ ] Test: render form, toggle GST checkbox, verify display updates
- [ ] Test: toggle PST checkbox, verify display updates independently
- [ ] Test: input amount, verify tax display recalculates (no server call)
- [ ] Test: submit form with `gstApplicable=true`, verify API call includes boolean flag (not rate)
- [ ] Test: edit mode, form pre-populates with expense data including flags
- [ ] Test: accessibility (checkbox can be toggled via keyboard, labels associated)
- [ ] Coverage: ≥80% for ExpenseForm tax logic

**File Path**: `frontend/tests/unit/features/expenses/ExpenseForm.spec.tsx`

**Test**: `npm run test -- ExpenseForm.spec.tsx` passes; coverage ≥80%.

---

### T013 - E2E: Expense create and read with taxes

- [ ] T013 [US1] Write Playwright E2E test in `frontend/e2e/tests/expenses-tax.spec.ts`

**Description**: Full CRUD flow: create expense with taxes, read, verify UI display.

**Acceptance Criteria**:
- [ ] Test flow: login → navigate to create expense form → fill amount (100) → toggle GST checkbox → toggle PST checkbox → verify display shows gst_amount=5, pst_amount=7, total=112 → save → verify expense in list shows taxes → click to view detail → verify tax breakdown displayed
- [ ] Test without taxes: create expense with both flags false → total = subtotal (no taxes added)
- [ ] API calls verified: POST request includes flags, response includes computed amounts
- [ ] UI assertions: tax display updates immediately on checkbox toggle (no spinner)
- [ ] Performance: test completes < 30s
- [ ] Error scenario: if tax calculation fails on backend, user sees error message

**File Path**: `frontend/e2e/tests/expenses-tax.spec.ts`

**Test**: `npm run e2e -- expenses-tax.spec.ts` passes; < 30s.

---

## Phase 4: User Story 2 - Line-item Taxes (P2)

### T014 - Backend: Tax calculation for line items

- [ ] T014 [P] Extend TaxCalculationService for line aggregation in `backend/src/modules/expenses/services/tax-calculation.service.ts`

**Description**: Update service to handle line-item tax calculation and aggregation.

**Acceptance Criteria**:
- [ ] When expense has line items: iterate each line, calculate line taxes from `lineItem.gstApplicable`/`pstApplicable` and defaults
- [ ] Aggregate line taxes to expense: `expense.gstAmount = SUM(line.gstAmount for all lines)`
- [ ] Expense-level flags ignored if lines present (line flags take precedence)
- [ ] Rounding: aggregate exact line amounts, round final expense total
- [ ] If line added/updated/deleted: parent expense totals automatically recalculated
- [ ] Handles mixed scenarios: some lines taxable, some not

**File Path**: `backend/src/modules/expenses/services/tax-calculation.service.ts`

**Test**: Existing unit tests extended to cover line aggregation scenarios.

---

### T015 - Backend: ExpenseLineService with tax calculation

- [ ] T015 [P] Implement line-item service methods in `backend/src/modules/expenses/services/expense-line.service.ts`

**Description**: CRUD operations for expense items with automatic parent expense tax recalculation.

**Acceptance Criteria**:
- [ ] `createExpenseItem()`: call TaxCalculationService to compute line taxes, save line, then recalculate parent expense taxes
- [ ] `updateExpenseItem()`: same as create (recompute parent)
- [ ] `deleteExpenseItem()`: delete line, recalculate parent totals
- [ ] Transaction: all operations within Prisma transaction (atomic)
- [ ] No N+1 queries: fetch parent + all siblings in single query

**File Path**: `backend/src/modules/expenses/services/expense-line.service.ts`

**Test**: Contract tests verify line CRUD and parent aggregation.

---

### T016 - Contract tests for line-item tax endpoints

- [ ] T016 [P] Write contract tests in `backend/tests/contract/expense-lines.tax.spec.ts`

**Description**: API tests for creating/updating/reading expense line items with taxes.

**Acceptance Criteria**:
- [ ] Test POST `/expenses/:id/items` with `gstApplicable=true`: response includes computed `gstAmount`
- [ ] Test two lines with different tax flags: parent expense aggregates correctly
- [ ] Test PUT `/expenses/:id/items/:itemId`: toggle flags, verify recalculation
- [ ] Test DELETE `/expenses/:id/items/:itemId`: delete line, verify parent totals updated
- [ ] Error case: invalid flag → 400
- [ ] Verify persisted data: fetch expense with lines, confirm aggregation correct

**File Path**: `backend/tests/contract/expense-lines.tax.spec.ts`

**Test**: `npm run test -- expense-lines.tax.spec.ts` passes.

---

### T017 - Unit tests for line aggregation

- [ ] T017 Extend unit tests in `backend/tests/unit/expenses/tax-calculation.spec.ts`

**Description**: Additional unit test cases for line-level tax calculations and aggregation.

**Acceptance Criteria**:
- [ ] Test: two lines (line A: 50 + GST 5% = 2.50; line B: 50 + PST 7% = 3.50) → expense totals gstAmount=2.50, pstAmount=3.50, total=106
- [ ] Test: mixed tax applicability (line A no tax, line B with tax) → aggregation correct
- [ ] Test: delete line → parent aggregation updates
- [ ] Test: update line amount → parent aggregation updates

**File Path**: `backend/tests/unit/expenses/tax-calculation.spec.ts`

**Test**: `npm run test` includes new test cases; coverage remains ≥95%.

---

### T018 - Frontend: Line-item form with tax checkboxes

- [ ] T018 [US2] Update LineItemForm in `frontend/src/features/expenses/components/LineItemForm.tsx`

**Description**: Add checkboxes and tax display to line-item form component.

**Acceptance Criteria**:
- [ ] Add checkboxes: "Apply GST", "Apply PST"
- [ ] Display calculated `gstAmount`, `pstAmount`, `total` for line
- [ ] Same UX as expense-level: toggle updates display immediately
- [ ] Styling: consistent with expense form (Bootstrap, rem units)
- [ ] Accessibility: full keyboard navigation and ARIA labels

**File Path**: `frontend/src/features/expenses/components/LineItemForm.tsx`

**Test**: Manual UI test: create line with taxes, verify display.

---

### T019 - Frontend: LineItemForm unit tests

- [ ] T019 [US2] Write component tests in `frontend/tests/unit/features/expenses/LineItemForm.spec.tsx`

**Description**: Unit tests for line-item form tax functionality.

**Acceptance Criteria**:
- [ ] Test: toggle GST checkbox, verify display
- [ ] Test: amount input, verify tax display recalculates
- [ ] Test: submit with flags, verify API payload
- [ ] Coverage: ≥80% for LineItemForm tax logic

**File Path**: `frontend/tests/unit/features/expenses/LineItemForm.spec.tsx`

**Test**: `npm run test -- LineItemForm.spec.tsx` passes.

---

### T020 - E2E: Expense with line items and taxes

- [ ] T020 [US2] Extend E2E test in `frontend/e2e/tests/expenses-tax.spec.ts`

**Description**: Full CRUD flow including line items with different tax flags.

**Acceptance Criteria**:
- [ ] Test flow: create expense → add two line items (one with GST, one with PST) → verify parent expense aggregates correctly → save → view detail → verify all amounts displayed correctly → edit line (change tax flag) → verify parent recalculated
- [ ] Verify API calls: line creation includes flags, response includes amounts
- [ ] Delete line: parent totals update in UI

**File Path**: `frontend/e2e/tests/expenses-tax.spec.ts`

**Test**: `npm run e2e -- expenses-tax.spec.ts` passes; < 30s.

---

## Phase 5: User Story 3 - CSV Import/Export (P3)

### T021 - CSV export: include tax columns

- [ ] T021 [US3] Update CSV export in `backend/src/modules/export/services/export.service.ts`

**Description**: Include tax fields in exported CSV.

**Acceptance Criteria**:
- [ ] CSV columns added: `gst_applicable`, `gst_amount`, `pst_applicable`, `pst_amount` (after standard expense columns)
- [ ] Values exported: boolean flags as TRUE/FALSE, amounts as decimal (2 places)
- [ ] All expense records exported with tax values (even if 0/false)
- [ ] Line items (if exported separately): include same columns
- [ ] Round-trip: export → import → reimport produces identical data

**File Path**: `backend/src/modules/export/services/export.service.ts`

**Test**: Export expense with taxes, verify CSV columns and values.

---

### T022 - CSV import: parse and validate tax columns

- [ ] T022 [P] [US3] Update CSV import in `backend/src/modules/import/services/import.service.ts`

**Description**: Parse tax columns from imported CSV; validate and persist.

**Acceptance Criteria**:
- [ ] CSV import logic: parse `gst_applicable` column as boolean (TRUE/true/1 → true, else false)
- [ ] Parse `gst_amount`, `pst_amount` as decimal values
- [ ] Missing columns: default to false (no tax) and 0 (no amount)
- [ ] Validation: reject invalid boolean values with clear error message
- [ ] Validation: reject invalid decimal values (non-numeric) with error
- [ ] Legacy CSV (no tax columns): import succeeds, expenses created tax-exempt
- [ ] Transaction: all rows imported atomically (rollback on validation failure)

**File Path**: `backend/src/modules/import/services/import.service.ts`

**Test**: Import CSV with tax columns; verify persisted data. Import CSV without tax columns; verify defaults applied.

---

### T023 - Contract test: CSV round-trip with taxes

- [ ] T023 [US3] Write contract test in `backend/tests/contract/csv-tax-roundtrip.spec.ts`

**Description**: Export → import cycle preserves tax data integrity.

**Acceptance Criteria**:
- [ ] Export 5 expenses (mix of tax flags)
- [ ] Import exported CSV
- [ ] Verify imported data matches exported (checksum or field-by-field)
- [ ] Dates, amounts, flags, calculated fields all preserved

**File Path**: `backend/tests/contract/csv-tax-roundtrip.spec.ts`

**Test**: `npm run test -- csv-tax-roundtrip.spec.ts` passes.

---

## Phase 6: Quality Assurance & Polish

### T024 - Run full test suite and verify coverage

- [ ] T024 Run all tests and confirm coverage thresholds in `backend/` and `frontend/`

**Description**: Execute complete test suite; verify coverage and performance.

**Acceptance Criteria**:
- [ ] Backend: `npm run test` all pass; coverage report shows ≥85% lines, ≥75% branches for tax logic; ≥70% overall
- [ ] Backend: `npm run test:cov` generates coverage HTML
- [ ] Frontend: `npm run test` all pass; coverage ≥80% for tax-related components (ExpenseForm, LineItemForm)
- [ ] Frontend: `npm run e2e` passes; all E2E tests < 30s each
- [ ] Lint: `npm run lint` (backend and frontend) passes with 0 errors, 0 warnings
- [ ] Format: `npm run format` applies no new changes (code already formatted)
- [ ] Bundle size: frontend production build < 250KB gzipped (verify with `npm run build && gzip frontend/dist/index.js`)
- [ ] No N+1 queries: Prisma studio shows single query for expenses + lines (verified via test debugging)
- [ ] Performance: create/update expense with taxes < 800ms p95 (measured via E2E)
- [ ] All git changes committed: `git status` is clean

**File Paths**: All test files across `backend/tests/` and `frontend/tests/`

**Test**: `npm run test` in backend and frontend; `npm run e2e` in frontend; review coverage report.

---

## Phase Summary

| Phase | Tasks | Dependencies | Est. Days | Blocking? |
|-------|-------|--------------|-----------|-----------|
| **Phase 1: Setup & DB** | T001-T002 | None | 1 | Yes - all downstream |
| **Phase 2: Backend Infra** | T003-T008 | Phase 1 | 1.5 | Yes - frontend API |
| **Phase 3: US1 (Expense Tax)** | T006-T013 | Phase 2 | 2 | Yes - base feature |
| **Phase 4: US2 (Line Tax)** | T014-T020 | Phase 3 | 2 | Yes - extends base |
| **Phase 5: US3 (CSV)** | T021-T023 | Phase 3 | 1 | No - independent |
| **Phase 6: QA & Polish** | T024 | All | 0.5 | No - final gate |

---

## Parallel Execution Opportunities

### Day 1 (Phase 1)
- T001 + T002 (sequential, DB then schema)

### Day 2 (Phase 2)
- T003 (TaxCalculationService)
- T004 + T009 (DTOs + types, independent)
- T005 + T010 (service + API, dependent on T003, T004, T009)

### Day 3-4 (Phase 3 + Phase 5 start)
- **Parallel A**: T006 + T012 (backend tests + frontend tests, independent)
- **Parallel B**: T007 (contract tests, dependent on T005)
- **Parallel C**: T011 (form component, can start once types ready in T009)
- **Parallel D**: T021 + T022 (CSV export + import, independent of form)

### Day 5 (Phase 4)
- T014 + T015 + T016 + T017 (line service + tests, dependent on Phase 3 base)
- T018 + T019 (line form + tests)

### Day 5-6 (Phase 4 complete)
- T013 (E2E base) + T020 (E2E lines, depends on T018)
- T023 (CSV roundtrip)

### Day 7 (Phase 6 - final)
- T024 (full test suite, gate)

---

## Success Criteria (Feature Complete)

✅ **Functional**:
- [ ] All 24 tasks marked complete
- [ ] 100% of API calls with tax fields return correct computed amounts
- [ ] CSV export/import preserves tax data in round-trip test
- [ ] UI displays tax breakdown for 100% of expenses created with tax flags

✅ **Test Coverage**:
- [ ] Backend: ≥85% lines, ≥75% branches (tax logic)
- [ ] Frontend: ≥80% critical logic (forms)
- [ ] E2E: 100% of tax CRUD workflows tested

✅ **Quality Gates**:
- [ ] Lint: 0 errors, 0 warnings
- [ ] Performance: < 800ms p95 for create/update; E2E < 30s
- [ ] Bundle: < 250KB gzipped
- [ ] No N+1 queries

✅ **Mergeability**:
- [ ] PR review complete; all comments addressed
- [ ] Constitution Principles II-IV verified
- [ ] Changelog updated

---

## Task Dependency Graph

```
T001 (DB Migration)
  ↓
T002 (Prisma Schema)
  ↓
T003 (TaxCalcService)
  ├→ T004 (DTOs) ────→ T009 (Types) ────→ T010 (API) ──→ T011 (Form)
  ├→ T005 (Service)
  └→ T006 (Unit Tests) ─→ T007 (Contract Tests)
       ↓
       T012 (Form Tests)
       ↓
       T013 (E2E Basics)
            ↓
            T014 (Line Tax Calc) ──→ T015 (LineService)
                                      ├→ T016 (Line Contracts)
                                      ├→ T017 (Line Unit Tests)
                                      ├→ T018 (LineItemForm)
                                      ├→ T019 (LineForm Tests)
                                      └→ T020 (E2E Lines)
            
            T021 (CSV Export) ────────────────────────┐
            T022 (CSV Import) ────────────────────────┼→ T023 (CSV Roundtrip)
            
            All above ──────────────────────────────────→ T024 (QA & Coverage)
```

---

**Created by**: GitHub Copilot  
**Last Updated**: 2025-12-14  
**Mode**: speckit.tasks  
**Status**: Ready for Implementation ✅
