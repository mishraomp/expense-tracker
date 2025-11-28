# Feature Specification: Add frontend end-to-end tests

**Feature Branch**: `001-frontend-e2e-tests`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "Update the application frontend to add end to end tests (E2E) for core user flows and CI integration"

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

### User Story 1 - Successful user login and navigation (Priority: P1)

As an authenticated user, I must be able to land on the app and navigate to the Expenses list to confirm core UI functionality works.

**Why this priority**: Logging in and viewing primary business data (expenses) is the most critical user flow and should be verified by E2E tests.

**Independent Test**: Start app (backend + frontend), run the E2E login flow and assert that the Expenses table renders with expected columns and at least one row.

**Acceptance Scenarios**:

1. **Given** the app is running in an environment with a test Keycloak user, **When** the user logs in, **Then** the app shows the Expenses list and core nav elements.
2. **Given** the user is authenticated, **When** they navigate to a secondary route (Reports), **Then** they can view the reports page and go back to Expenses.

---

### User Story 2 - Create Edit Delete Expense (Priority: P2)

As a user, I should be able to create a new expense, edit it, and delete it from the UI and have the changes reflected in the UI.

**Why this priority**: These flows validate the app's core CRUD functionality and data integration with the backend.

**Independent Test**: Run a test that performs create -> assert exists -> edit -> assert changes -> delete -> assert removed.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Expenses page, **When** the user creates a new expense and submits, **Then** the new expense is displayed in the list.
2. **Given** the expense exists, **When** the user edits the expense description/amount and saves, **Then** the modified values are shown.
3. **Given** the expense exists, **When** the user deletes it, **Then** it is no longer present in the list.

---

### User Story 3 - Attachments Upload and Preview (Priority: P3)

As a user, I can add an attachment to an expense and confirm the upload & preview works.

**Why this priority**: Validates critical attachments integration (upload/preview UI) but can be validated after CRUD flows.

**Independent Test**: Upload a test file via the attachment flow, assert that the attachment badge/icon indicates presence and a preview or download is possible.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** the user uploads a small test file to an expense, **Then** the expense shows the attachment count incremented and serves the file on download.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

 - App receives backend error (5xx) - E2E tests should detect stable error handling and either retry or fail gracefully.
 - Auth is unavailable (Keycloak down) - Provide an alternate login path for tests (test user + pre-populated session or a test-only env variable to skip auth).
 - Large attachment uploads and network timeouts - Tests should allow upload timeouts to be configurable and assert failure messages.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

 - **FR-E2E-001**: Add a test runner and dependencies for E2E tests in the frontend (recommended: Playwright Test).
 - **FR-E2E-002**: Provide a sample test setup (CI + reproducible local run) and a small suite that includes at least: login, navigate to expenses, create/edit/delete expense.
 - **FR-E2E-003**: Provide an e2e test helper to programmatically authenticate to the backend or bypass Keycloak in test environments.
 - **FR-E2E-004**: Configure test artifacts to capture screenshots, traces, and failure logs for debugging on CI.
 - **FR-E2E-005**: Add `npm run e2e` (or similar) to `frontend/package.json` and a GitHub Actions job to execute tests in CI.

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

 - **E2E Test Config**: Contains test configuration values and credentials (baseUrl, timeouts, auth tokens).
 - **Fixtures**: Test data definitions for expenses and attachments.
 - **Test Helpers**: Utilities for seeding test data and getting authentication tokens.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

 - **SC-001**: At least one P1 user flow (login + view Expenses) is covered by an E2E test and passes consistently on CI (>=95% success within 3 attempts).
 - **SC-002**: CRUD scenario passes on CI for creating, editing, and deleting an expense with verifiable state changes (assertions on UI and API if applicable).
 - **SC-003**: Tests produce artifacts (screenshots/traces/logs) and produce failure reports automatically on CI when run in GitHub Actions.
 - **SC-004**: Running `npm run e2e` locally reproduces CI runs and passes on a clean environment with documented prerequisites.

### Assumptions
- Auth flow uses Keycloak and the CI environment can run a Keycloak container or we provide a bypass for tests.
- A dedicated test database or seeded dataset is available in CI.
- Playwright is used as the recommended E2E runner based on Vite + React compatibility.

### Non-goals
- Do not add backend-only tests or modify backend logic beyond enabling test-only endpoints for authentication.
- Do not change the primary runtime or replace production auth for regular usage; any test-only bypass must be opt-in via env flags and documented.

### Deliverables
- Add `frontend/e2e` folder with Playwright config and starter tests.
- Update `frontend/package.json` to include e2e scripts.
- Add CI job (`.github/workflows/e2e.yml`) to run E2E tests on PRs to `main`/`release` branches.
- Add test helpers for authentication and test data setup.

### Next Steps & Implementation Plan
1. Add Playwright dependency and initial config to `frontend`.
2. Implement a helper for programmatic authentication (Keycloak test token, or test-only login path) and fixture seeds for expenses.
3. Add three core scripts: `e2e:install`, `e2e:run`, and `e2e:ci` to `frontend/package.json`.
4. Add one P1 test (login + view expenses), one P2 test (CRUD), and one P3 test (attachments) as examples.
5. Add GitHub Actions workflow to run E2E tests.


### Clarifications

#### Q1: Auth Strategy [NEEDS CLARIFICATION]
**Context**: The project uses Keycloak; E2E tests need a robust authentication strategy.

**Question**: Should tests use a Keycloak test realm in CI (Option A), implement a test-only auth bypass endpoint (Option B), or use programmatic token exchange to obtain a JWT (Option C)?

| Option | Answer | Implications |
|--------|--------|--------------|
| A | Use Keycloak test realm in CI | High parity with production; requires Keycloak in CI and test user management. |
| B | Implement a test-only auth bypass endpoint | Faster, more stable tests; slightly less parity with production. |
| C | Use programmatic token exchange | Balanced approach — no UI login but still uses Keycloak to generate tokens. |

#### Q2: Test Runner [NEEDS CLARIFICATION]
**Context**: The project needs a runner for the E2E tests.

**Question**: Should we use Playwright Test (recommended), Cypress, or another runner?

| Option | Answer | Implications |
|--------|--------|--------------|
| A | Playwright Test | Powerful built-in runner, cross-browser, traces and CI-friendly; recommended for Vite + React. |
| B | Cypress | Mature runner with a good DX, but cross-browser support has tradeoffs. |
| C | Other | Provide name | We'll adapt tests accordingly. |

#### Q3: Browser Coverage [NEEDS CLARIFICATION]
**Context**: CI test runtime increases with more browsers.

**Question**: Which browsers should CI run E2E tests on — Chromium only, Chromium+Firefox, or Chromium+Firefox+WebKit?

| Option | Answer | Implications |
|--------|--------|--------------|
| A | Chromium only | Faster CI runs, catches the majority of issues. |
| B | Chromium + Firefox | Broader coverage with moderate runtime increase. |
| C | Chromium + Firefox + WebKit | Full coverage, longer CI runtime.


