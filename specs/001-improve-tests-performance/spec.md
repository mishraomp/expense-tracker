# Feature Specification: Improve test coverage and performance

**Feature Branch**: `001-improve-tests-performance`  
**Created**: 2025-11-23  
**Status**: Draft  
**Input**: User request: "Improve test coverage and performance of the application (backend + frontend) — add more unit/integration/e2e tests, add CI coverage reporting, and optimize slow endpoints and DB queries for responsive UX."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Backend core tests & CI enforcement (Priority: P1)

Add comprehensive unit and integration tests for the backend core services that power primary features: attachments (upload/replace/remove), expenses/incomes CRUD, auth flows (Keycloak guard), and reporting queries. Ensure tests run in CI with coverage gates.

**Why this priority**: Backend logic is the primary source of production incidents and regressions; improving coverage early prevents regressions and makes refactors safer.

**Independent Test**: Run the backend unit and contract tests locally using the project's configured test runner and verify coverage meets the configured threshold; run the CI job to confirm coverage enforcement.

**Acceptance Scenarios**:

1. **Given** a new or changed backend module, **When** unit/contract tests are executed, **Then** the pipeline fails if coverage drops below the configured threshold (Backend >= 80%) and the failing tests are shown.
2. **Given** attachments service changes, **When** the attachment unit/integration tests run, **Then** all tests pass using DB and Drive mocks and all edge cases (checksum collisions, missing record) are covered.

---

### User Story 2 - Frontend unit & e2e coverage (Priority: P1)

Increase frontend unit tests to include UploadWidget, Drive store, Expense/Income forms and critical components; add e2e tests that exercise OAuth flow and upload, including Drive callback and status checks.

**Why this priority**: UX errors and regressions in upload/Drive flows are visible to users; automating them reduces manual testing and catches regressions sooner.

**Independent Test**: Execute the frontend unit and e2e test suites locally; ensure new e2e tests for OAuth + upload pass in CI with a Drive mock/stub.

**Acceptance Scenarios**:

1. **Given** a changed UploadWidget or drive store, **When** unit & e2e tests run, **Then** they pass and verify the upload flow including attach-to-expense and webViewLink saved.
2. **Given** the OAuth code exchange flow, **When** the frontend e2e runs with a mock authorization server, **Then** it completes the token exchange and the Drive connected flag flips true.

---

### User Story 3 - Performance: Reports and common endpoint optimization (Priority: P1)

Identify and optimize the slowest endpoints (reports, expenses list, and attachments listing) by adding database indices, caching results where appropriate, and optimizing queries or aggregations.

**Why this priority**: Reports are performance-critical and expensive; optimizations provide better UX and reduced load on the DB.

**Independent Test**: Run the current benchmark job, measure median and p95 response times; apply changes; re-run benchmarks and show improvements.

**Acceptance Scenarios**:

1. **Given** current report queries, **When** measured under test load, **Then** median latency decreases to <100ms and p95 < 300ms for typical dataset size (10k expenses per user).
2. **Given** expense list and attachment operations, **When** measured, **Then** request times are under 200ms median and p95 under 500ms.

---

[Add more user stories as needed, each with an assigned priority]

### User Story 4 - CI performance & benchmarking (Priority: P2)

Add performance tests and benchmarks into CI that run on a subset of the dataset and report metrics; add gating thresholds to flag regressions.

**Why this priority**: Continuous performance monitoring prevents regressions and provides early feedback.

**Independent Test**: The CI runs a benchmark job and fails only if regressions exceed configured thresholds (for example 10% regression on p95 for measured endpoints since baseline).

**Acceptance Scenarios**:

1. **Given** baseline metrics, **When** a new PR runs benchmarks, **Then** regression <= configured threshold for measured endpoints; otherwise PR is flagged.

---

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- Auth/Token failure during e2e: ensure Drive OAuth errors are handled gracefully with user message and reconnection flow.
- Missing or revoked refresh token: service must return 401/403 where relevant and prompt user to reconnect; tests should cover revoke & invalid_grant handling.
- CI resource limits: performance benchmarks should run in a short subset; CI must not be blocked by long-run test jobs. Benchmarks should be tagged as optional or run in separate job to avoid PR slowdowns.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: Add or enhance automated unit tests for backend modules: attachments.service, oauth.service, google-drive.provider, limit-check.service, and major controllers. Tests must assert on both success and expected error paths.
- **FR-002**: Add contract tests (HTTP-level) that validate attachment endpoints behavior (upload, replace, delete, list), using test database and Drive mocks. Tests should be idempotent.
- **FR-003**: Add frontend unit tests for UploadWidget, Drive store, Expense/Income forms, and essential components; add e2e tests to cover upload, Drive connect/disconnect, and Drive callback.
 - **FR-004**: Add CI coverage reporting and enforce minimum thresholds: Backend >=80% and Frontend >=75% (configurable); PRs failing thresholds are flagged.
- **FR-005**: Add performance benchmarks into CI for selected endpoints and add a performance dashboard (or export to CSV/JSON) for tracking.
- **FR-006**: Optimize DB query performance for select expensive endpoints (reports, expense listing) by adding indices and query tuning; document the rationale for each change and include before/after benchmark numbers in PR description.
- **FR-007**: Add caching layer where appropriate for expensive read-only queries (e.g., reports) and include cache invalidation strategies for writes.
- **FR-008**: Add tests for Drive connectivity revocation and reauthorization flows; simulate revoked tokens and assert reconnection UX path.

## Key Entities

- **Test suites**: Unit (backend/frontend), Contract (backend), E2E (frontend), Performance benchmarks.
- **CI Jobs**: Unit tests, coverage reporting, e2e tests with drive mock, benchmark runner.
- **Benchmarks**: Scripts measuring latency and throughput for Reports, Expenses listing, Attachments upload.
- **Baseline Metrics**: Median/p95 latency for endpoints; coverage percentage per package.

## Assumptions

- Default dataset size for performance benchmarks will be 10k expenses and 2k attachments unless otherwise specified.
- Drive operations will be mocked in CI to avoid using real Drive; a small subset of manual tests may be executed locally with real Drive if needed.
- Coverage thresholds are configurable and may be reduced temporarily for low-priority modules.

## Success Criteria *(mandatory)*

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Backend unit coverage >=80% (lines/branches/statements), Frontend unit coverage >=75% across PRs; coverage report is generated on CI for each PR.
- **SC-002**: Backend critical endpoints (reports, expenses list, attachments list) show median latency <100ms and p95 <300ms for dataset specified; report generation route average latency decreases by at least 30% vs. baseline.
- **SC-003**: E2E tests verifying Drive connect + upload run in CI successfully at least once per pipeline (Drive mocked), and manual scripts demonstrate true Drive uploads locally.
- **SC-004**: CI performance regression thresholds established and PRs are flagged if regression >10% for p95 latency; baseline metrics recorded in repository.
- **SC-005**: Attachments upload latency median <3s end-to-end under synthetic test conditions and unit/integration tests cover error flows including invalid_grant and revoked tokens.

---

Clarifications (provided by stakeholder):

- Prioritization targets: Reports, Expenses list, Attachments listing + upload, Search, Export.
- Coverage thresholds: Backend=80% and Frontend=75% (configurable).
- CI performance tests: Only scheduled/nightly performance tests.

End of spec.
