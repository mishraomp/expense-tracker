# Tasks: Frontend E2E Tests

Feature: Add frontend end-to-end tests
Branch: `001-frontend-e2e-tests`

## Phase 1: Setup
- [x] T001 Create E2E project skeleton in `frontend/e2e/`
- [x] T002 Add Playwright config in `frontend/e2e/playwright.config.ts`
- [x] T003 Add scripts `e2e:install`, `e2e:run`, `e2e:run:headed`, `e2e:ci` to `frontend/package.json`
- [x] T004 Add CI workflow `.github/workflows/e2e.yml`
- [x] T005 Seed test user credentials via env (`E2E_USERNAME`, `E2E_PASSWORD`) and document in `frontend/README.md`

## Phase 2: Foundational
- [x] T006 Add auth helper `frontend/e2e/tests/helpers/auth.ts` using Keycloak UI or token exchange
- [x] T007 Prepare test data seeding helper in `frontend/e2e/tests/helpers/fixtures.ts`
- [x] T008 Configure artifacts (screenshots, traces) in Playwright config

## Phase 3: User Story 1 (P1)
- [x] T009 [US1] Implement login test `frontend/e2e/tests/login.spec.ts`
- [x] T010 [US1] Assert Expenses table loads with columns and at least one row
- [x] T011 [US1] Navigate to Reports and back to Expenses

## Phase 4: User Story 2 (P2)
- [x] T012 [US2] Implement create expense test `frontend/e2e/tests/crud.spec.ts`
- [x] T013 [US2] Implement edit expense flow in the same test
- [x] T014 [US2] Implement delete expense and verify removal

## Phase 5: User Story 3 (P3)
- [x] T015 [US3] Implement attachment upload test `frontend/e2e/tests/attachments.spec.ts`
- [x] T016 [US3] Verify preview/download works and count increments

## Final Phase: Polish & Cross-Cutting
- [x] T017 Review selectors and add resilient role-based queries
- [x] T018 Add retry logic or waits where necessary to reduce flakiness
- [x] T019 Update documentation `frontend/README.md` for local + CI usage

## Dependencies
- P1 → P2 → P3
- Setup must precede Foundational and all User Stories

## Parallel Execution Examples
- [P] T002 Playwright config and [P] T003 package.json scripts
- [P] T009 login test and [P] T012 CRUD test (once auth helper ready)

## Implementation Strategy
- MVP: Complete User Story 1 (login + navigate)
- Incrementally add CRUD, then attachments
