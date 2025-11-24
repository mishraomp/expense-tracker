# Tasks: Google Drive Document Storage Integration

**Input**: Design documents from `/specs/001-drive-docs/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/attachments.openapi.yaml, quickstart.md
**Tests Included**: Yes (spec success criteria reference coverage & E2E). Test tasks appear before implementation in each story phase.

## Format: `- [ ] T### [P?] [USn?] Description with file path`
- `[P]` = Task can run in parallel (different files / no unmet dependency)
- `[USn]` only for user story phases (US1 P1, US2 P2, US3 P3)
- All tasks have explicit file paths or clear target

---
## Phase 1: Setup (Shared Infrastructure)
**Purpose**: Establish baseline environment, dependencies, skeleton structure & configuration.

- [X] T001 Add backend env vars doc (`backend/README.md`) for Drive (GOOGLE_DRIVE_* + ATTACHMENT_* limits)
- [X] T002 Add frontend env vars doc (`frontend/README.md`) for Drive and attachment limits
- [X] T003 [P] Add backend dependency `googleapis` in `backend/package.json` (Drive API)
- [X] T004 [P] Add checksum library (if absent) `crypto` usage helper in `backend/src/common/utils/checksum.ts`
- [X] T005 [P] Scaffold backend attachments module directory `backend/src/modules/attachments/`
- [X] T006 [P] Create `attachments.module.ts` exporting controller & service in `backend/src/modules/attachments/attachments.module.ts`
- [X] T007 [P] Create frontend feature folder `frontend/src/features/attachments/`
- [X] T008 [P] Create placeholder `UploadWidget.tsx` in `frontend/src/features/attachments/UploadWidget.tsx`
- [X] T009 [P] Create placeholder `AttachmentList.tsx` in `frontend/src/features/attachments/AttachmentList.tsx`
- [X] T010 [P] Create backend Google Drive provider interface `backend/src/modules/attachments/providers/drive.provider.ts`
- [X] T011 [P] Create backend config constants file `backend/src/modules/attachments/attachment.constants.ts`
- [X] T012 [P] Add MIME/type whitelist constant in `backend/src/modules/attachments/attachment.constants.ts`
- [X] T013 Add initial documentation section to `specs/001-drive-docs/quickstart.md` referencing new module paths
- [X] T014 Verify existing expense/income modules export IDs needed for linking (inspect & note) in `backend/src/modules/expenses/` & `backend/src/modules/incomes/` (no code change) – IDs accessible via `req.user.sub` already present in controllers.

---
## Phase 2: Foundational (Blocking Prerequisites)
**Purpose**: Core infra required before any story (data schema, OAuth flow, provider abstraction, validation plumbing).
**CRITICAL**: Must complete before User Stories start.

- [X] T015 Create Prisma model changes in `backend/prisma/schema.prisma` (Attachment, BulkImportJob, optional UserDriveAuth)
- [X] T016 Generate SQL migration file `backend/migrations/V2.5.0__attachments.sql` from Prisma diff
- [X] T017 [P] Implement DB CHECK constraint for sizeBytes (<=5MB) in `V2.5.0__attachments.sql`
- [X] T018 [P] Add enum status & indexes (expense/income/status/retention) in `V2.5.0__attachments.sql`
- [X] T019 [P] Add BulkImportJob table & index (`idx_bulk_job_user_status`) in `V2.5.0__attachments.sql`
- [X] T020 [P] Optional UserDriveAuth table creation (decide ADR) in `V2.5.0__attachments.sql`
- [X] T021 Implement Drive provider concrete class `backend/src/modules/attachments/providers/google-drive.provider.ts`
- [X] T022 Implement provider interface methods (uploadFile, replaceFile, deleteFile, listUserFiles, createUserFolderIfMissing) in same file
- [X] T023 Add OAuth exchange controller `backend/src/modules/attachments/oauth.controller.ts` (POST /api/drive/oauth/exchange) skeleton
- [X] T024 Implement OAuth service `backend/src/modules/attachments/oauth.service.ts` (token exchange + refresh)
- [X] T025 [P] Create DTOs folder `backend/src/modules/attachments/dto/`
- [X] T026 [P] Define `upload-attachment.dto.ts` (recordType, recordId) in DTO folder
- [X] T027 [P] Define `replace-attachment.dto.ts` with checksum optional
- [X] T028 Implement validation pipes / class-validator decorators in DTOs
- [X] T029 Implement file/mime/size guard or interceptor `backend/src/modules/attachments/interceptors/file-validation.interceptor.ts`
- [X] T030 Implement max-per-record check utility `backend/src/modules/attachments/services/limit-check.service.ts`
- [X] T031 [P] Add config injection (env var parsing) in `backend/src/app.module.ts` or dedicated config module for Drive values (module imported)
- [X] T032 [P] Add front-end API client placeholder functions for attachments & oauth in `frontend/src/services/api.ts`
- [X] T033 Update Keycloak auth guard to ensure user identity accessible in attachments flow `backend/src/common/guards/keycloak-auth.guard.ts` (already exposes user.id)
- [X] T034 [P] Add checksum utility front-end `frontend/src/services/checksum.ts` (browser SHA-256)
- [X] T035 Add ADR placeholder file `specs/001-drive-docs/adr-token-encryption.md` (draft)
- [X] T036 [P] Add ADR placeholder file `specs/001-drive-docs/adr-resumable-uploads.md` (draft)
- [X] T037 Create test Drive sandbox config in `backend/tests/setup-drive-mocks.ts`
- [X] T038 Integrate provider mock into global test setup `backend/tests/setup.ts`

**Checkpoint**: DB schema, OAuth, provider, validation ready. Proceed to User Story 1.

---
## Phase 3: User Story 1 - Attach Documents (Priority: P1) 🎯 MVP
**Goal**: Upload up to 5 allowed documents per expense/income, store metadata & show attachments in record detail.
**Independent Test**: Create expense with 1–5 files; verify metadata, retrieval, open link.

### Tests (Write First)
 - [X] T039 [P] [US1] Contract test upload success (`backend/tests/contract/attachments.upload.spec.ts`)
 - [X] T040 [P] [US1] Contract test invalid mime / size >5MB (`backend/tests/contract/attachments.invalid.spec.ts`)
 - [X] T041 [P] [US1] Contract test exceeds max attachments block (`backend/tests/contract/attachments.limit.spec.ts`)
 - [X] T042 [P] [US1] Unit test limit-check service (`backend/tests/unit/limit-check.service.spec.ts`)
 - [X] T043 [P] [US1] Unit test drive provider (uploadFile mocks) (`backend/tests/unit/google-drive.provider.spec.ts`)
 - [X] T044 [P] [US1] Frontend component test UploadWidget basic render (`frontend/tests/unit/UploadWidget.spec.tsx`)
 - [X] T045 [US1] Playwright E2E test attach receipt flow (`frontend/tests/e2e/attachments.upload.spec.ts`)

### Implementation
- [X] T046 [P] [US1] Implement attachments service upload method `backend/src/modules/attachments/attachments.service.ts`
- [X] T047 [P] [US1] Implement metadata persistence (Prisma create) in same service
- [X] T048 [P] [US1] Implement attachments controller POST `/api/attachments` `backend/src/modules/attachments/attachments.controller.ts`
- [X] T049 [P] [US1] Implement list attachments controller GET `/api/records/{type}/{id}/attachments`
- [X] T050 [US1] Integrate attachment listing into expense detail response (`backend/src/modules/expenses/expenses.controller.ts`)
- [X] T051 [US1] Integrate attachment listing into income detail response (`backend/src/modules/incomes/incomes.controller.ts`)
- [X] T052 [US1] Frontend UploadWidget: multi-select, progress UI `frontend/src/features/attachments/UploadWidget.tsx`
- [X] T053 [US1] Frontend API integration to trigger upload `frontend/src/services/api.ts`
- [X] T054 [US1] Add checksum pre-compute before POST `frontend/src/services/checksum.ts`
- [X] T055 [US1] Expense form integration (add upload section) `frontend/src/features/expenses/components/ExpenseForm.tsx`
- [X] T056 [US1] Income form integration (add upload section) `frontend/src/features/incomes/IncomeForm.tsx`
- [X] T057 [US1] Simple open link action (new tab) for attachment in detail views `frontend/src/features/expenses/ExpenseDetail.tsx`
- [X] T058 [US1] Error messaging: size, mime, count (accessible) `frontend/src/features/attachments/UploadWidget.tsx`
- [X] T059 [US1] Logging upload events (service) `backend/src/modules/attachments/attachments.service.ts`
- [X] T060 [US1] Update quickstart with upload instructions `specs/001-drive-docs/quickstart.md`

**Checkpoint**: US1 independently functional & test suite passing.

---
## Phase 4: User Story 2 - View, Preview, Replace & Remove (Priority: P2)
**Goal**: Manage existing attachments: preview modal, replace file maintaining history, soft-delete removal with retention scheduling.
**Independent Test**: Replace & remove existing attachment; preview accessible.

### Tests (Write First)
- [X] T061 [P] [US2] Contract test replace endpoint success `backend/tests/contract/attachments.replace.spec.ts`
- [X] T062 [P] [US2] Contract test remove endpoint soft delete `backend/tests/contract/attachments.remove.spec.ts`
- [X] T063 [P] [US2] Unit test replacement sets retention date `backend/tests/unit/attachments.replacement.spec.ts`
- [X] T064 [P] [US2] Unit test remove sets status removed and retention `backend/tests/unit/attachments.removal.spec.ts`
- [X] T065 [P] [US2] Frontend preview modal accessibility test `frontend/tests/unit/PreviewModal.a11y.spec.tsx`
- [X] T066 [US2] Playwright E2E test replace & preview flow `frontend/tests/e2e/attachments.replace.spec.ts`

### Implementation
- [X] T067 [P] [US2] Implement replace logic (service) `backend/src/modules/attachments/attachments.service.ts`
- [X] T068 [P] [US2] Implement controller PUT `/api/attachments/{id}` replace `backend/src/modules/attachments/attachments.controller.ts`
- [X] T069 [P] [US2] Implement soft delete (service) `backend/src/modules/attachments/attachments.service.ts`
- [X] T070 [P] [US2] Implement controller DELETE `/api/attachments/{id}` remove `backend/src/modules/attachments/attachments.controller.ts`
- [X] T071 [US2] Add `replacedByAttachmentId` set + old status removed w/ retention expiry
- [X] T072 [US2] Implement preview modal component `frontend/src/features/attachments/PreviewModal.tsx`
- [X] T073 [US2] Enhance AttachmentList with preview/replace/remove actions `frontend/src/features/attachments/AttachmentList.tsx`
- [X] T074 [US2] Frontend API calls for replace/remove in `frontend/src/services/api.ts`
- [X] T075 [US2] Accessibility focus trap & keyboard support in PreviewModal
- [X] T076 [US2] Logging replace/remove events `backend/src/modules/attachments/attachments.service.ts`
- [X] T077 [US2] Update expense detail to use AttachmentList UI `frontend/src/features/expenses/ExpenseDetail.tsx`
- [X] T078 [US2] Update income detail to use AttachmentList UI `frontend/src/features/incomes/IncomeDetail.tsx`
- [X] T079 [US2] Update quickstart with replace/remove instructions `specs/001-drive-docs/quickstart.md`

**Checkpoint**: US2 complete; US1 & US2 independently testable.

---
## Phase 5: User Story 3 - Bulk Import & Sync Orphans (Priority: P3)
**Goal**: Bulk upload mapping, progress tracking, orphan detection & remediation.
**Independent Test**: Bulk job of mixed files with mapping & orphan listing functioning.

### Tests (Write First)
- [X] T080 [P] [US3] Contract test start bulk job endpoint `backend/tests/contract/bulk.start.spec.ts`
- [X] T081 [P] [US3] Contract test bulk job status & completion `backend/tests/contract/bulk.status.spec.ts`
- [X] T082 [P] [US3] Contract test orphan listing endpoint `backend/tests/contract/attachments.orphans.spec.ts`
- [X] T083 [P] [US3] Unit test mapping heuristics `backend/tests/unit/bulk.mapping.spec.ts`
- [X] T084 [P] [US3] Unit test duplicate detection checksum logic `backend/tests/unit/bulk.duplicate.spec.ts`
- [X] T085 [P] [US3] Frontend bulk UI render test `frontend/tests/unit/BulkImportPanel.spec.tsx`
- [X] T086 [US3] Playwright E2E bulk import & orphan scan flow `frontend/tests/e2e/attachments.bulk.spec.ts`

### Implementation
- [X] T087 [P] [US3] Extend contracts: define bulk job endpoints (POST /api/attachments/bulk, GET /api/attachments/bulk/{jobId}) `specs/001-drive-docs/contracts/attachments.openapi.yaml`
- [X] T088 [P] [US3] Implement bulk service `backend/src/modules/attachments/bulk.service.ts`
- [X] T089 [P] [US3] Implement bulk controller `backend/src/modules/attachments/bulk.controller.ts`
- [X] T090 [US3] Implement mapping heuristic (filename/date/amount) `backend/src/modules/attachments/bulk-mapping.util.ts`
- [X] T091 [US3] Implement duplicate detection using checksum cache `backend/src/modules/attachments/bulk.service.ts`
- [X] T092 [US3] Implement controlled concurrency (3 parallel) in bulk service
- [X] T093 [US3] Implement progress persistence updates (uploaded/skipped/duplicate/error counts) in bulk service
- [X] T094 [US3] Implement cancel flow (status -> canceled) in bulk controller
- [X] T095 [P] [US3] Implement orphan scan service `backend/src/modules/attachments/orphan-scan.service.ts`
- [X] T096 [P] [US3] Implement orphan listing controller GET `/api/attachments/orphans` (already in contract) refine response
- [X] T097 [US3] Frontend BulkImportPanel component `frontend/src/features/attachments/BulkImportPanel.tsx`
- [X] T098 [US3] Frontend mapping suggestion UI list `frontend/src/features/attachments/BulkMappingSuggestions.tsx`
- [X] T099 [US3] Frontend progress display component `frontend/src/features/attachments/BulkProgress.tsx`
- [X] T100 [US3] Frontend orphan list component `frontend/src/features/attachments/OrphanList.tsx`
- [X] T101 [US3] Frontend API functions for bulk endpoints `frontend/src/services/api.ts`
- [X] T102 [US3] Logging bulk job lifecycle events `backend/src/modules/attachments/bulk.service.ts`
- [X] T103 [US3] Update quickstart with bulk & orphan instructions `specs/001-drive-docs/quickstart.md`

**Checkpoint**: US3 complete; all stories independently functional.

---
## Phase 6: Polish & Cross-Cutting Concerns
**Purpose**: Non-functional improvements, performance, security, documentation, retention purge job.

- [X] T104 [P] Implement purge cron job script `backend/src/cron/purge-attachments.job.ts` (status=removed & retentionExpiresAt < now)
- [X] T105 [P] Implement orphan scheduled scan job `backend/src/cron/orphan-scan.job.ts`
- [X] T106 Implement encryption utility for refresh token `backend/src/common/security/encryption.util.ts`
- [X] T107 Integrate token encryption into OAuth service `backend/src/modules/attachments/oauth.service.ts`
- [X] T108 [P] Add performance benchmark script `backend/scripts/benchmark-attachments-upload.ts`
- [X] T109 [P] Add logging enrichment (structured fields) `backend/src/common/interceptors/logging.interceptor.ts`
- [X] T110 Accessibility audit updates preview modal ARIA `frontend/src/features/attachments/PreviewModal.tsx`
- [X] T111 [P] Add ADR finalization token encryption `specs/001-drive-docs/adr-token-encryption.md`
- [X] T112 [P] Add ADR finalization resumable uploads `specs/001-drive-docs/adr-resumable-uploads.md`
- [X] T113 Update documentation with retention & purge details `specs/001-drive-docs/quickstart.md`
- [X] T114 [P] Add additional unit tests coverage edge cases (`backend/tests/unit/attachments.edge.spec.ts`)
- [X] T115 [P] Add frontend error state tests (limit/mime) `frontend/tests/unit/UploadWidget.errors.spec.tsx`
- [X] T116 Final performance validation & p95 comparison notes `specs/001-drive-docs/research.md`
- [X] T117 Final review of bundle delta (<30KB) note in `frontend/README.md`
- [X] T118 Security review checklist completion `specs/001-drive-docs/research.md`
- [X] T119 Documentation: add troubleshooting section `specs/001-drive-docs/quickstart.md`

---
## Dependencies & Execution Order

### Phase Dependencies
- Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phases 3–5) → Polish (Phase 6)
- Foundational tasks block all user story work.

### User Story Independence
- US1 can start immediately after Foundational completion.
- US2 depends only on Foundational (not on completion of US1 logic except reuse of module; remains independently testable via its own replace/remove actions).
- US3 depends on Foundational (bulk & orphan features independent). Requires Attachment table present but not completion of US1/US2 behaviors.

### Internal Ordering per Story
1. Tests (fail first) → service/model/controller implementation → frontend components → integration & logging → docs.
2. Parallel tasks marked [P] may proceed concurrently.

### Parallel Opportunities
- Setup: T003–T012 parallelizable.
- Foundational: T017–T020, T025–T027, T031–T034 can run in parallel.
- Each story: test tasks (first group) parallel; then service/controller tasks; frontend components parallel (distinct files).
- Bulk story tasks T087–T096 have multiple parallelizable items.

---
## Parallel Examples

### US1 Parallel Batch
- T039, T040, T041, T042, T043, T044 (tests)
- T046, T047, T048, T049 (service + controllers) after tests written
- T052, T054, T055, T056 (frontend components/forms)

### US2 Parallel Batch
- T061–T065 (tests)
- T067–T070 (backend operations)
- T072–T075 (frontend preview & actions)

### US3 Parallel Batch
- T080–T085 (tests)
- T087–T096 (backend bulk/orphan features)
- T097–T101 (frontend bulk/orphan UI)

---
## Implementation Strategy

### MVP (US1 Only)
1. Complete Setup & Foundational.
2. Implement US1 tests then logic.
3. Validate p95 latency & coverage.
4. Deploy/demonstrate upload + listing + open.

### Incremental Delivery
- US2 adds management (replace/remove/preview) without altering US1 core behavior.
- US3 adds productivity features (bulk & orphan scan).

### Quality Gates
- Each story merged only after tests for that story pass & coverage thresholds met.
- Performance benchmark run (T108) before merging Polish phase.

### Stop Criteria
- MVP acceptable when US1 tasks T039–T060 complete and success criteria SC-001..SC-003 validated.

---
## Format Validation
All tasks follow required checklist pattern: `- [ ] T### [P?] [USn?] Description with file path`. Story phases correctly labeled; non-story phases omit story labels.

---
