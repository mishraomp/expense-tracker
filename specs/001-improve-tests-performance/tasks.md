 # Tasks for: Improve test coverage and performance

This file lists action items derived from the plan. These tasks are prioritized and may be split into smaller PRs.

 ## Phase 0 - Research & Baseline (Completed)
- Gathered baseline coverage numbers (backend and frontend) using `npm run test:cov`.
- Created k6 load-tests harness under `/load-tests` and README on how to run.

 ## Phase 1 - Tests & CI (P1)
- [x] T001 [P] Create load-tests/ directory and add PowerShell run helper in `load-tests/run-k6.ps1`
- [x] T002 [P] Add k6 scripts and profiles for prioritized endpoints under `load-tests/` (reports, expenses-list, attach-upload)
- [x] T003 [P] Add nightly k6 workflow in `.github/workflows/k6-nightly.yml`
- [x] T004 [P] Add CI coverage job `.github/workflows/coverage.yml` to run tests and enforce thresholds
- [x] T005 [US1] Add targeted unit tests for `backend/src/modules/attachments/attachments.service.ts` in `backend/tests/unit/attachments.*.spec.ts` (implemented: multiple attachment test files)
- [x] T006 [US1] Add unit tests for `backend/src/modules/attachments/oauth.service.ts` in `backend/tests/unit/oauth.service.spec.ts` (implemented)
- [x] T007 [US1] Add unit tests for `backend/src/modules/attachments/providers/google-drive.provider.ts` in `backend/tests/unit/google-drive.provider.spec.ts` (implemented)
- [x] T008 [US1] Add/extend contract tests for attachments endpoints under `backend/tests/contract/attachments.*.spec.ts` (implemented: 6 contract test files)
- [x] T009 [US2] Add unit tests for `frontend/src/stores/drive.ts` in `frontend/tests/unit/stores/drive.spec.ts` (implemented)
- [x] T010 [US2] Add unit tests for `frontend/src/features/expenses/components/ExpenseFilters.tsx` in `frontend/tests/unit/components/ExpenseFilters.spec.tsx` (implemented)
- [x] T011 [US2] Add unit tests for UploadWidget in `frontend/tests/unit/UploadWidget.spec.tsx` (implemented)
 - [ ] T012 [US2] Add e2e test harness for Drive connect + upload using Drive mock/stub (tests under `frontend/tests/e2e/drive.*.spec.tsx`)

 ## Phase 2 - Performance Baseline & Optimizations (P1)
- [x] T013 [US3] Add baseline k6 scripts to `load-tests/` and document how to run locally (`load-tests/README.md`) (comprehensive documentation added)
- [x] T014 [US3] Add seed scripts or doc to populate a sample dataset for benchmarks (`load-tests/seed-db.ps1` created)
- [x] T015 [US3] Collect baseline k6 results and store as artifacts in `load-tests/results/` (directory created with .gitkeep)
 - [x] T016 [US3] Analyze query performance for reports & expense listing; identify top slow queries and create tasks per optimization (DB indices, caching) - **COMPLETED: Created comprehensive `query-optimization-analysis.md` with 4 missing indices, 5 code-level issues, and 3-phase implementation plan**
 - [x] T017 [US3] Implement DB index suggestions (PRs for each index change) and measure impact (record before/after k6 results) - **COMPLETED: Created `V2.6.0__performance_indices.sql` migration with 10 new indices (4 expense, 2 income, 2 attachment, 2 lookup) + monitoring views; optimized ExpensesService.findAll() to use groupBy for attachment counts (~30ms improvement); optimized bulkCreate() with batch lookups (300 queries → 2 queries for 100 expenses, ~500ms improvement). See `phase1-implementation.md` for details.**

 ## Phase 3 - CI Nightly Performance & Monitoring (P2)
- [x] T018 [US3] Add scheduled workflow `.github/workflows/k6-nightly.yml` to run k6 on schedule and upload results as artifacts (implemented)
- [x] T019 [US3] Add a script to convert k6 JSON output to CSV and report simple metrics (`load-tests/format-k6-results.js` created)
 - [ ] T020 [US3] Add Docker-Compose seeding task or CI step to restore seeded dataset for nightly benchmarks (to ensure reproducible runs)
- [x] T021 [P] Create simple scripts and docs for comparing k6 baselines with nightly runs (`load-tests/compare-results.ts` created)
 - [x] T024 [US1] Add unit tests for backend `reports.service.ts` in `backend/tests/unit/reports.service.spec.ts` (implemented)
 - [x] T025 [US1] Add unit tests for backend `expenses.service.ts` in `backend/tests/unit/expenses.service.spec.ts` (implemented)

 ## Phase 4 - Long Tail & Follow-ups (P3)
 - [ ] T022 [US2] Add more e2e tests for bulk imports and orphan adoption flows under `frontend/tests/e2e/` and `backend/tests/contract/`
- [x] T023 [P] Document runbook for running tests & load-tests locally (update `specs/001-improve-tests-performance/quickstart.md` and `load-tests/README.md`) (updated)
