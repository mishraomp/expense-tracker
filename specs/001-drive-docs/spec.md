# Feature Specification: Google Drive Document Storage Integration

**Feature Branch**: `001-drive-docs`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "upgrade the existing application to use google drive to store documents for expenses or income entries"

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

### User Story 1 - Attach Documents (≤5) to Expense/Income (Priority: P1)

User can attach up to five receipts (expense) or invoices (income) while creating or editing an entry. Each document is uploaded, stored in a designated Google Drive folder (with per-user subfolder), Drive file metadata (custom properties) populated for searchability (expense/income id, type, date, amount, category), and a reference stored in the database (no BLOB). The user sees confirmation and can later open any attachment. Database only stores references (driveFileId + metadata) and never binary content.

**Why this priority**: Enables auditable proof for financial records; core value with immediate user benefit and minimal dependency on later bulk/sync features.

**Independent Test**: Create a new expense with a receipt upload; verify upload succeeds, metadata stored, link retrievable, and expense retrieval returns document reference; income scenario similar.

**Acceptance Scenarios**:

1. **Given** an authenticated user on expense create form, **When** they select 3 PDFs (each ≤5MB) and submit, **Then** the expense is saved and all 3 attachment references appear in the expense detail with valid preview links.
2. **Given** an existing income entry with 2 attachments, **When** user edits and uploads 2 more (≤5MB each), **Then** total attachments become 4 and new metadata searchable in Drive.
3. **Given** an expense already having 5 attachments, **When** user attempts to add a 6th, **Then** the system blocks the action with an accessible error: "Maximum of 5 attachments reached." (no upload attempt made).
4. **Given** a failed network during the 2nd of 3 uploads, **When** user submits, **Then** successfully uploaded files persist, failed file is skipped, user sees a retry option for the failed file only.
5. **Given** a user without Google Drive authorization, **When** they attempt first upload, **Then** they are prompted to authorize and the original upload resumes automatically after success.

---

### User Story 2 - View, Preview, Replace & Remove Attachments (Priority: P2)

User can view a list of attachments for an expense/income, preview (inline modal or new tab), download, replace an existing document, or remove it entirely. Removal cleans up mapping and (subject to retention policy) remote file.

**Why this priority**: Enhances daily usability and trust—managing existing attachments is essential for ongoing record maintenance.

**Independent Test**: Given an expense with an attachment from Story 1, verify user can preview, download, replace with new file, and remove; expense data integrity unaffected.

**Acceptance Scenarios**:

1. **Given** an expense with a PDF attachment, **When** user clicks preview, **Then** document content displays in accessible modal with close/focus management.
2. **Given** an income with an image attachment, **When** user chooses replace and uploads new file, **Then** old file reference replaced and new link active.
3. **Given** an expense with attachment, **When** user clicks remove, **Then** attachment metadata disappears from detail and (retention action executed) user sees success toast.
4. **Given** an attachment replaced, **When** user refreshes list, **Then** only latest attachment appears (no orphan link).

---

### User Story 3 - Bulk Import & Sync Existing Local Documents (Priority: P3)

User can select multiple local files, map each to existing expenses/incomes (auto-suggestion by filename/date/amount), run a bulk upload job, and view progress + summary (success, conflicts, duplicates). System detects orphaned attachments (Drive files without DB link) and offers optional cleanup.

**Why this priority**: Batch adoption of historical documents increases long-term value; less critical than core attach/manage flows.

**Independent Test**: Run bulk upload with 10 mixed receipts/invoices; verify mappings, job progress status, final summary with accurate counts, and orphan detection separate from main flows.

**Acceptance Scenarios**:

1. **Given** a set of 5 receipt files, **When** user runs bulk import with auto-match, **Then** at least 4 files correctly associate (criteria: date+amount) and summary shows mapping status.
2. **Given** duplicate filename selected twice, **When** job completes, **Then** duplicate flagged and not uploaded twice.
3. **Given** an orphan Drive file (present in folder, no DB record), **When** user runs sync, **Then** file appears in orphan list with option to link or delete.
4. **Given** a bulk job cancel action mid-process, **When** user cancels, **Then** already-uploaded attachments persist and remaining queue halts gracefully.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Upload exceeds max allowed file size -> reject before Drive call; user sees size error.
- Google OAuth token expired during upload -> refresh token, retry once, then fail with actionable message.
- User revokes Drive permission externally -> first subsequent upload prompts re-auth.
- File type unsupported (e.g., executable) -> validation failure; not sent to Drive.
- Duplicate document intentionally uploaded (same checksum) -> flagged; user chooses keep or skip.
- Drive quota exceeded mid-bulk job -> job pauses; user sees quota warning and partial summary.
- Network timeout after Drive upload success but before metadata save -> reconcile by periodic reconciliation job (detect file without DB link and attach or purge).

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST enable attaching up to 5 documents per expense or income during create/edit and persist a metadata record for each.
- **FR-002**: System MUST obtain user authorization with appropriate Google Drive scopes (at minimum file read/write limited to app folder).
- **FR-003**: System MUST create (if absent) a root application folder and per-user subfolder for stored documents.
- **FR-004**: System MUST store metadata: `{attachmentId, linkedExpenseId|linkedIncomeId, driveFileId, webViewLink, mimeType, sizeBytes, originalFilename, checksum, uploadedByUserId, createdAt}`.
- **FR-005**: System MUST validate file types and only accept: `pdf`, `png`, `jpeg`, `jpg`, `xlsx`, `docx` (MIME mapping: application/pdf, image/png, image/jpeg, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.openxmlformats-officedocument.wordprocessingml.document). Any other extension or MIME MUST be rejected before upload.
- **FR-006**: System MUST provide preview functionality for image/PDF documents via accessible modal or new tab link.
- **FR-007**: System MUST allow replacing an existing attachment (old metadata archived or deleted per retention policy).
- **FR-008**: System MUST allow removing an attachment and execute retention logic (delete or mark) without impacting expense/income integrity.
- **FR-009**: System MUST support bulk import: mapping local files to existing records, uploading sequentially or in controlled parallel batches, and generating a completion summary (counts: uploaded, skipped, duplicates, errors).
- **FR-010**: System MUST detect orphan Drive files (present in storage folders, not referenced in DB) and list them for remediation.
- **FR-011**: System MUST enforce a maximum file size of 5MB per uploaded document (validation before upload call).
- **FR-012**: System MUST restrict attachment visibility to the owning authenticated user only (private per user) unless elevated admin role in future extension.
- **FR-013**: System MUST implement soft-delete retention: removed attachments marked `removed` and scheduled for permanent deletion after 7 days (grace period) via purge job.
- **FR-019**: System MUST enforce a maximum of 5 attachments per expense/income (attempts beyond blocked client-side and server-side).
- **FR-020**: System MUST populate Google Drive file custom properties (expenseOrIncomeId, recordType, recordDate, amountMinorUnits, categoryId, checksum) to support Drive-side search and reconciliation.
- **FR-021**: System MUST store only references (driveFileId, metadata) in DB—no binary file data.
- **FR-014**: System SHOULD ensure uploads are resumable or fail gracefully with clear retry guidance (initial implementation may not support chunked resumable; mark ADR if omitted).
- **FR-015**: System MUST log all upload, replace, remove, bulk job events (attachment id, user id, timestamp, result code) for audit.
- **FR-016**: System MUST maintain performance budgets (no endpoint p95 increase >10%).
- **FR-017**: System MUST provide accessible error messages (plain language, next step) on attachment failures.
- **FR-018**: System MUST allow filtering attachments by file type and date in bulk import UI.

### Key Entities *(include if feature involves data)*

- **Attachment**: Represents a single document linked to either an Expense or Income. Attributes: id, driveFileId, linkedExpenseId (nullable), linkedIncomeId (nullable), mimeType, sizeBytes, originalFilename, checksum, webViewLink, uploadedByUserId, createdAt, replacedByAttachmentId (nullable), status (active|removed|orphan), retentionExpiresAt (nullable), driveProperties (recordType, recordDate, amountMinorUnits, categoryId).
- **BulkImportJob**: Represents a batch upload process. Attributes: id, initiatedByUserId, totalFiles, uploadedCount, skippedCount, duplicateCount, errorCount, status (pending|running|completed|canceled|failed), startedAt, finishedAt.
- **OrphanScanResult**: Transient aggregation: list of driveFileIds without DB link + suggested action (link/delete).
- **UserDriveAuth**: Per-user authorization context (tokens, scopes summary, lastValidatedAt) without storing sensitive refresh tokens in plaintext (secured via configuration/secrets store).

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of single attachment uploads ≤5MB complete (upload + metadata persist) in <5 seconds.
- **SC-002**: 0 broken attachment links after 100 consecutive create/edit operations (automated test run).
- **SC-003**: Replace operation completes with new preview link visible in <3 seconds 90% of the time.
- **SC-004**: Bulk import of 10 standard receipt files (<3MB each) finishes in <30 seconds with ≥90% correct auto-matches.
- **SC-005**: Upload failure rate (non-user-cancel) <2% over first 30 days of production usage.
- **SC-006**: No API endpoint p95 latency increase >10% compared to baseline after feature deployment.
- **SC-007**: ≥85% line coverage and ≥75% branch coverage for new backend attachment module; ≥80% line coverage for new frontend attachment management logic; Playwright P1 scenario (attach receipt) passes reliably.
- **SC-008**: 90% of surveyed users report improved record completeness within first release cycle.
- **SC-009**: Orphan scan detects and surfaces ≥95% of intentionally simulated orphan files in test environment.
