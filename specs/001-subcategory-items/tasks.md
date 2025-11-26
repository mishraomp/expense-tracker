# Tasks: Expense Item Tracking

**Input**: Design documents from `/specs/001-subcategory-items/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Tests ARE included as this is a P1 feature requiring TDD (Test-Driven Development)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and feature structure

- [ ] T001 Review existing expense module structure in backend/src/modules/expenses/
- [ ] T002 [P] Review existing expense frontend structure in frontend/src/features/expenses/
- [ ] T003 [P] Create feature documentation directory structure per plan.md

**Checkpoint**: Project structure understood, ready for foundational work

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & Migrations

- [ ] T004 Create Flyway migration V2.7.0__expense_items.sql with expense_items table
- [ ] T005 Add Prisma ExpenseItem model to backend/prisma/schema.prisma
- [ ] T006 Add expense-to-items one-to-many relationship in Prisma schema
- [ ] T007 [P] Create database indexes: idx_expense_items_expense_id, idx_expense_items_category_id
- [ ] T008 [P] Create GIN index idx_expense_items_name for full-text search
- [ ] T009 Add CHECK constraint for item amount > 0 in migration
- [ ] T010 Run Prisma generate to update client types
- [ ] T011 Test migration rollback and re-apply (verify idempotency)

### Backend DTOs & Types

- [ ] T012 [P] Create CreateExpenseItemDto in backend/src/modules/expenses/dto/create-expense-item.dto.ts
- [ ] T013 [P] Create UpdateExpenseItemDto in backend/src/modules/expenses/dto/update-expense-item.dto.ts
- [ ] T014 [P] Create ExpenseItemResponseDto in backend/src/modules/expenses/dto/expense-item-response.dto.ts
- [ ] T015 Modify CreateExpenseDto to add optional items array in backend/src/modules/expenses/dto/create-expense.dto.ts
- [ ] T016 Modify ExpenseResponseDto to include items array in backend/src/modules/expenses/dto/expense-response.dto.ts

### Frontend Types

- [ ] T017 [P] Create ExpenseItem TypeScript interface in frontend/src/types/expense-item.ts
- [ ] T018 Modify Expense type to include items array in frontend/src/features/expenses/types/expense.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Expense with Multiple Items (Priority: P1) 🎯 MVP

**Goal**: Users can create expenses with itemized breakdowns, splitting a single receipt across categories

**Independent Test**: Create expense with 3 items totaling to expense amount, verify all items saved and linked

### Tests for User Story 1 (TDD - Write FIRST, ensure FAIL)

- [ ] T019 [P] [US1] Contract test for POST /api/expenses/:id/items in backend/tests/contract/expense-items.spec.ts
- [ ] T020 [P] [US1] Contract test for POST /api/expenses with nested items in backend/tests/contract/expense-items.spec.ts
- [ ] T021 [P] [US1] Unit test for item sum validation in backend/tests/unit/expenses-items.service.spec.ts
- [ ] T022 [P] [US1] Frontend unit test for ExpenseItemForm validation in frontend/tests/unit/ExpenseItemForm.test.tsx
- [ ] T023 [US1] Playwright E2E test for creating expense with items in frontend/tests/e2e/expense-with-items.spec.ts

### Backend Implementation for User Story 1

- [ ] T024 [US1] Implement createItem method in backend/src/modules/expenses/expenses.service.ts
- [ ] T025 [US1] Implement item sum validation logic in expenses.service.ts
- [ ] T026 [US1] Add POST /api/expenses/:id/items endpoint in backend/src/modules/expenses/expenses.controller.ts
- [ ] T027 [US1] Modify create expense to handle nested items array in expenses.service.ts
- [ ] T028 [US1] Add transaction support for expense + items creation in expenses.service.ts
- [ ] T029 [US1] Add validation: subcategory must belong to category in expenses.service.ts

### Frontend Implementation for User Story 1

- [ ] T030 [P] [US1] Create ExpenseItemForm component in frontend/src/features/expenses/components/ExpenseItemForm.tsx
- [ ] T031 [P] [US1] Create ExpenseItemList component in frontend/src/features/expenses/components/ExpenseItemList.tsx
- [ ] T032 [US1] Add React Hook Form field array for items in ExpenseForm.tsx
- [ ] T033 [US1] Implement item sum calculation and validation in ExpenseItemForm.tsx
- [ ] T034 [US1] Add real-time sum display (total vs itemized) in ExpenseItemForm.tsx
- [ ] T035 [US1] Add TanStack Query hook for createItem in frontend/src/features/expenses/api/expenseApi.ts
- [ ] T036 [US1] Modify createExpense hook to support items array in expenseApi.ts
- [ ] T037 [US1] Add accessibility: keyboard navigation for item rows in ExpenseItemForm.tsx
- [ ] T038 [US1] Add WCAG AA compliance: focus indicators and ARIA labels in ExpenseItemForm.tsx

**Checkpoint**: User Story 1 complete - Can create expenses with items, validate sums, view breakdown

---

## Phase 4: User Story 2 - Edit and Manage Expense Items (Priority: P1)

**Goal**: Users can edit item details, add forgotten items, or remove incorrect items

**Independent Test**: Create expense with 2 items, edit one item amount, add third item, delete one item, verify all operations work

### Tests for User Story 2 (TDD - Write FIRST, ensure FAIL)

- [ ] T039 [P] [US2] Contract test for PUT /api/expenses/:id/items/:itemId in backend/tests/contract/expense-items.spec.ts
- [ ] T040 [P] [US2] Contract test for DELETE /api/expenses/:id/items/:itemId in backend/tests/contract/expense-items.spec.ts
- [ ] T041 [P] [US2] Unit test for item update validation in backend/tests/unit/expenses-items.service.spec.ts
- [ ] T042 [P] [US2] Frontend unit test for item edit in frontend/tests/unit/ExpenseItemForm.test.tsx
- [ ] T043 [US2] Playwright E2E test for editing/deleting items in frontend/tests/e2e/expense-with-items.spec.ts

### Backend Implementation for User Story 2

- [ ] T044 [US2] Implement updateItem method in backend/src/modules/expenses/expenses.service.ts
- [ ] T045 [US2] Implement deleteItem (soft delete) method in expenses.service.ts
- [ ] T046 [US2] Add PUT /api/expenses/:id/items/:itemId endpoint in backend/src/modules/expenses/expenses.controller.ts
- [ ] T047 [US2] Add DELETE /api/expenses/:id/items/:itemId endpoint in expenses.controller.ts
- [ ] T048 [US2] Re-validate sum after item updates/deletes in expenses.service.ts
- [ ] T049 [US2] Add optimistic locking for concurrent item edits in expenses.service.ts

### Frontend Implementation for User Story 2

- [ ] T050 [US2] Add inline edit capability to ExpenseItemList component
- [ ] T051 [US2] Add delete confirmation modal in ExpenseItemList.tsx
- [ ] T052 [US2] Add TanStack Query hooks: updateItem, deleteItem in frontend/src/features/expenses/api/expenseApi.ts
- [ ] T053 [US2] Implement optimistic updates for item edits in expenseApi.ts
- [ ] T054 [US2] Add validation error display for edit operations in ExpenseItemForm.tsx
- [ ] T055 [US2] Handle loading states during item updates in ExpenseItemList.tsx

**Checkpoint**: User Story 2 complete - Can edit, add, and delete items with validation

---

## Phase 5: User Story 5 - Handle Expenses Without Items (Priority: P1)

**Goal**: Maintain backward compatibility - expenses without items continue to work

**Independent Test**: Create expense without items, verify it saves and displays normally; ensure existing expenses still function

### Tests for User Story 5 (TDD - Write FIRST, ensure FAIL)

- [ ] T056 [P] [US5] Contract test for expense creation without items in backend/tests/contract/expenses.spec.ts
- [ ] T057 [P] [US5] Unit test for backward compatibility in backend/tests/unit/expenses.service.spec.ts
- [ ] T058 [P] [US5] Frontend unit test for non-itemized expense display in frontend/tests/unit/ExpenseDetail.test.tsx
- [ ] T059 [US5] Playwright E2E test for creating/viewing expense without items in frontend/tests/e2e/expenses-basic.spec.ts

### Backend Implementation for User Story 5

- [ ] T060 [US5] Ensure expense queries work with optional items include in expenses.service.ts
- [ ] T061 [US5] Make items include conditional (only detail view) in expenses.controller.ts
- [ ] T062 [US5] Verify existing expense endpoints unchanged (GET /api/expenses list) in expenses.controller.ts
- [ ] T063 [US5] Test backward compatibility with existing database records in expenses.service.spec.ts

### Frontend Implementation for User Story 5

- [ ] T064 [US5] Conditionally render items section only when items exist in frontend/src/features/expenses/components/ExpenseDetail.tsx
- [ ] T065 [US5] Ensure expense list displays correctly for expenses without items in frontend/src/features/expenses/components/ExpensesTable.tsx
- [ ] T066 [US5] Add optional item count badge in expense list view in ExpensesTable.tsx
- [ ] T067 [US5] Make item form collapsible/optional in ExpenseForm.tsx

**Checkpoint**: User Story 5 complete - Backward compatibility verified, expenses work with or without items

---

## Phase 6: User Story 3 - View Item-Level Reports and Analytics (Priority: P2)

**Goal**: Users can analyze spending at item level, search by item name, view top items

**Independent Test**: Create multiple expenses with overlapping item names, search for "coffee", verify all coffee items aggregated

### Tests for User Story 3 (TDD - Write FIRST, ensure FAIL)

- [ ] T068 [P] [US3] Contract test for GET /api/expenses?itemName= in backend/tests/contract/expenses.spec.ts
- [ ] T069 [P] [US3] Contract test for GET /api/reports/items/top in backend/tests/contract/reports.spec.ts
- [ ] T070 [P] [US3] Unit test for item aggregation query in backend/tests/unit/reports.service.spec.ts
- [ ] T071 [US3] Frontend unit test for item search in frontend/tests/unit/ExpenseFilters.test.tsx

### Backend Implementation for User Story 3

- [ ] T072 [US3] Add itemName filter to expense query in backend/src/modules/expenses/expenses.service.ts
- [ ] T073 [US3] Implement item-level aggregation queries in backend/src/modules/reports/reports.service.ts
- [ ] T074 [US3] Add GET /api/reports/items/top endpoint in backend/src/modules/reports/reports.controller.ts
- [ ] T075 [US3] Add GET /api/reports/items/search endpoint for item name search in reports.controller.ts
- [ ] T076 [US3] Optimize queries with proper indexes (verify EXPLAIN plans) in reports.service.ts
- [ ] T077 [US3] Add pagination for item-level reports in reports.service.ts

### Frontend Implementation for User Story 3

- [ ] T078 [US3] Add item name search field in frontend/src/features/expenses/components/ExpenseFilters.tsx
- [ ] T079 [US3] Create ItemReports component in frontend/src/features/reports/components/ItemReports.tsx
- [ ] T080 [US3] Add TanStack Query hooks for item reports in frontend/src/features/reports/api/reportsApi.ts
- [ ] T081 [US3] Display top items chart in reports page in frontend/src/routes/reports.tsx
- [ ] T082 [US3] Add item-level filtering to existing reports in ItemReports.tsx
- [ ] T083 [US3] Implement item name autocomplete/suggestions in ExpenseFilters.tsx

**Checkpoint**: User Story 3 complete - Item-level analytics and search functional

---

## Phase 7: User Story 4 - Bulk Import Expenses with Items (Priority: P3)

**Goal**: Users can import CSV files with itemized expense data

**Independent Test**: Prepare CSV with 10 expenses × 3 items, import, verify all created with proper relationships

### Tests for User Story 4 (TDD - Write FIRST, ensure FAIL)

- [ ] T084 [P] [US4] Unit test for CSV parsing with items in backend/tests/unit/import.service.spec.ts
- [ ] T085 [P] [US4] Contract test for POST /api/import with items in backend/tests/contract/import.spec.ts
- [ ] T086 [US4] Frontend E2E test for CSV import with items in frontend/tests/e2e/import-items.spec.ts

### Backend Implementation for User Story 4

- [ ] T087 [US4] Design CSV format for expenses with items in backend/src/modules/import/import.service.ts
- [ ] T088 [US4] Implement CSV parser supporting nested items in import.service.ts
- [ ] T089 [US4] Add bulk create with items transaction in import.service.ts
- [ ] T090 [US4] Implement validation: item sum ≤ expense total during import in import.service.ts
- [ ] T091 [US4] Add detailed error reporting (line numbers, item errors) in import.service.ts

### Frontend Implementation for User Story 4

- [ ] T092 [US4] Update CSV template download to include item columns in frontend/src/features/import/components/ImportGuide.tsx
- [ ] T093 [US4] Display import preview with item breakdown in frontend/src/features/import/components/ImportPreview.tsx
- [ ] T094 [US4] Show per-item validation errors in import results in frontend/src/features/import/components/ImportResults.tsx

**Checkpoint**: User Story 4 complete - Bulk import with items functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Documentation

- [ ] T095 [P] Create research.md documenting Prisma patterns and index decisions
- [ ] T096 [P] Create data-model.md with ExpenseItem schema documentation
- [ ] T097 [P] Create quickstart.md for developers working with items
- [ ] T098 [P] Document API contracts in specs/001-subcategory-items/contracts/
- [ ] T099 [P] Update main README.md with item tracking feature description

### Performance & Optimization

- [ ] T100 Verify no N+1 queries using Prisma query logs in expenses.service.ts
- [ ] T101 Run EXPLAIN on item aggregation queries, verify index usage
- [ ] T102 [P] Measure frontend bundle size impact (Vite analyzer)
- [ ] T103 [P] Optimize item list rendering for 50+ items (consider virtualization)
- [ ] T104 Measure and validate all success criteria from spec.md

### Code Quality

- [ ] T105 [P] Add JSDoc comments to all new service methods
- [ ] T106 [P] Run ESLint and fix any violations in new code
- [ ] T107 [P] Ensure TypeScript strict mode compliance
- [ ] T108 Code review: verify no breaking changes to existing APIs
- [ ] T109 Verify test coverage: backend ≥85%, frontend ≥80%

### Security

- [ ] T110 [P] Verify item name sanitization prevents injection
- [ ] T111 [P] Verify user authorization on item endpoints (items belong to user's expense)
- [ ] T112 Audit: ensure no sensitive data in item logs

### Accessibility & UX

- [ ] T113 [P] Verify WCAG AA: color contrast ≥4.5:1 in item forms
- [ ] T114 [P] Verify keyboard navigation: tab order, Enter/Space activation
- [ ] T115 [P] Test screen reader compatibility for item components
- [ ] T116 Add loading skeletons for item operations
- [ ] T117 Add success/error toasts for item CRUD operations

### Final Validation

- [ ] T118 Run full test suite: backend unit + contract + integration
- [ ] T119 Run Playwright E2E suite for all P1 user journeys
- [ ] T120 Manual QA: test all acceptance scenarios from spec.md
- [ ] T121 Verify backward compatibility: test with existing expense data
- [ ] T122 Performance test: create expense with 50 items, verify < 500ms load

**Checkpoint**: Feature complete, polished, and production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 (Create items): Can start after Foundational - No story dependencies
  - US2 (Edit items): Depends on US1 (needs items to edit)
  - US5 (No items): Can start after Foundational - Parallel with US1/US2
  - US3 (Reports): Depends on US1/US2 (needs items to report on)
  - US4 (Import): Depends on US1 (uses same item creation logic)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2) - MUST complete first
    ↓
    ├─→ US1 (Phase 3) - Create items ← MVP PRIORITY
    │       ↓
    │       ├─→ US2 (Phase 4) - Edit items ← MVP PRIORITY
    │       │       ↓
    │       │       ├─→ US3 (Phase 6) - Reports
    │       │       │
    │       │       └─→ US4 (Phase 7) - Import
    │       │
    │       └─→ US5 (Phase 5) - No items (parallel with US1/US2) ← MVP PRIORITY
    │
    └─→ Polish (Phase 8) - After US1, US2, US5 for MVP
```

### MVP Scope (Minimum Viable Product)

**Deliver FIRST** for immediate value:
1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 (Create items)
4. Phase 4: US2 (Edit items)
5. Phase 5: US5 (Backward compatibility)
6. Phase 8: Polish (critical items only)

**Post-MVP Enhancements**:
- Phase 6: US3 (Reports) - Adds analytics value
- Phase 7: US4 (Import) - Power-user feature

### Within Each User Story

1. **Tests FIRST** (TDD): Write all tests, ensure they FAIL
2. **Backend then Frontend**: Complete backend API before frontend integration
3. **Core then Integration**: Core implementation before cross-story integration
4. **Validate**: Test story independently before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T007, T008: Index creation (parallel)
- T012, T013, T014: DTOs (parallel)
- T017, T018: Frontend types (parallel)

**Phase 3 (US1 Tests)**:
- T019, T020, T021, T022: All contract/unit tests (parallel)

**Phase 3 (US1 Frontend)**:
- T030, T031: Components (parallel, different files)

**Phase 4 (US2 Tests)**:
- T039, T040, T041, T042: All tests (parallel)

**Phase 6 (US3 Tests)**:
- T068, T069, T070: All tests (parallel)

**Phase 8 (Documentation)**:
- T095, T096, T097, T098, T099: All docs (parallel)

**Phase 8 (Quality)**:
- T102, T103: Performance analysis (parallel)
- T105, T106, T107: Code quality tasks (parallel)
- T110, T111: Security audits (parallel)
- T113, T114, T115: Accessibility checks (parallel)

---

## Parallel Example: Foundational Phase

```bash
# Launch DTOs together:
Task: "Create CreateExpenseItemDto in backend/.../create-expense-item.dto.ts"
Task: "Create UpdateExpenseItemDto in backend/.../update-expense-item.dto.ts"
Task: "Create ExpenseItemResponseDto in backend/.../expense-item-response.dto.ts"

# Launch frontend types together:
Task: "Create ExpenseItem interface in frontend/src/types/expense-item.ts"
Task: "Modify Expense type in frontend/.../types/expense.ts"

# Launch indexes together:
Task: "Create indexes: idx_expense_items_expense_id, idx_expense_items_category_id"
Task: "Create GIN index idx_expense_items_name"
```

---

## Implementation Strategy

### MVP First (Phases 1-5 Only)

1. ✅ Complete Phase 1: Setup (understand structure)
2. ✅ Complete Phase 2: Foundational (database + types) - BLOCKS ALL
3. ✅ Complete Phase 3: US1 (create items) - Core feature
4. ✅ Complete Phase 4: US2 (edit items) - Essential for usability
5. ✅ Complete Phase 5: US5 (no items) - Backward compatibility
6. **STOP and VALIDATE**: Test all P1 stories independently
7. ✅ Complete Phase 8: Critical polish only (T100-T109)
8. Deploy MVP!

**MVP delivers**: Users can create, edit expenses with items; existing expenses unaffected

### Incremental Delivery (Post-MVP)

1. MVP deployed ✅
2. Add Phase 6: US3 (Reports) → Test independently → Deploy
3. Add Phase 7: US4 (Import) → Test independently → Deploy
4. Complete Phase 8: Remaining polish → Deploy

### Parallel Team Strategy

With 3 developers after Foundational complete:

- **Developer A**: Phase 3 (US1) → Phase 6 (US3)
- **Developer B**: Phase 4 (US2) → Phase 7 (US4)
- **Developer C**: Phase 5 (US5) → Phase 8 (Polish)

Stories integrate independently without conflicts.

---

## Risk Mitigation Tasks

### Performance Risk (High)

- **T100**: Verify no N+1 queries - CRITICAL before merge
- **T101**: Verify index usage - CRITICAL before merge
- **T122**: Load test 50 items - Before production

### Data Integrity Risk (Medium)

- **T028**: Transaction support - Ensures atomicity
- **T049**: Optimistic locking - Prevents concurrent edit conflicts
- **T063**: Backward compatibility test - Ensures no data corruption

### UX Complexity Risk (Low)

- **T032-T034**: Field array validation - Well-established React Hook Form pattern
- **T037-T038**: Accessibility - Ensures usability

---

## Success Metrics Validation

Map tasks to success criteria from spec.md:

- **SC-001** (5 items < 60s): T030-T034 (form UX)
- **SC-002** (Display < 500ms): T060-T061, T100 (optimize includes)
- **SC-003** (List < 1s): T066, T100 (conditional loading)
- **SC-004** (Search < 1s): T072, T101 (GIN index)
- **SC-005** (Validation < 200ms): T033 (client-side)
- **SC-006** (Reports < 5s): T076, T101 (query optimization)
- **SC-007** (Import < 30s): T088-T089 (bulk insert)
- **SC-008** (95% success): T037-T038, T116-T117 (UX/feedback)
- **SC-009** (Zero data loss): T028, T049 (transactions)
- **SC-010** (50 items): T103, T122 (virtualization test)
- **SC-011** (10k items < 2s): T076, T101 (indexes)
- **SC-012** (Export < 10s): T012 response optimization

**Validation**: T104, T120, T122 verify all criteria met

---

## Notes

- **TDD enforced**: Tests written BEFORE implementation (P1 features)
- **Backward compatible**: US5 ensures zero breaking changes
- **MVP focused**: Phases 1-5 + critical polish delivers core value
- **Incremental**: Each phase independently testable and deployable
- **Parallel ready**: [P] tasks can run concurrently
- **Constitution compliant**: T105-T109 ensure quality gates met
- **Performance validated**: T100-T104, T122 prevent regressions

**Total Tasks**: 122 tasks across 8 phases
**MVP Tasks**: ~80 tasks (Phases 1-5 + critical polish)
**Estimated MVP**: 3-4 weeks (2 developers)
**Full Feature**: 4-5 weeks (including reports + import)
