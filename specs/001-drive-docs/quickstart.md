# Quickstart: Google Drive Attachments Feature

## 1. Prerequisites
- Google Cloud Project with Drive API enabled.
- OAuth 2.0 Client (Web application) credentials: Client ID + Client Secret.
- Redirect URI configured for frontend (e.g. https://localhost:5173/oauth/callback or http://localhost:5173 if hash-based).
- Environment variables added to backend & frontend.

## 2. Environment Variables

Backend `.env` additions:
```
GOOGLE_DRIVE_CLIENT_ID=<client-id>
GOOGLE_DRIVE_CLIENT_SECRET=<client-secret>
GOOGLE_DRIVE_REDIRECT_URI=<frontend-callback-url>
GOOGLE_DRIVE_ROOT_FOLDER_NAME=ExpenseTracker
ATTACHMENT_MAX_PER_RECORD=5
ATTACHMENT_MAX_SIZE_BYTES=5242880
```

Frontend `.env` additions:
```
VITE_GOOGLE_DRIVE_CLIENT_ID=<client-id>
VITE_GOOGLE_DRIVE_REDIRECT_URI=<frontend-callback-url>
VITE_ATTACHMENT_MAX_PER_RECORD=5
VITE_ATTACHMENT_MAX_SIZE_BYTES=5242880
```

## 3. Folder Creation Logic
1. On first successful user authorization, backend ensures root folder `ExpenseTracker` exists (create by name if absent).
2. Creates child folder named `<userKeycloakSubject>` if absent.
3. Stores folder IDs in DB (UserDriveAuth or user preferences) for reuse.

## 4. Authorization Flow
1. Frontend initiates OAuth by redirecting user to Google with scopes: `https://www.googleapis.com/auth/drive.file`.
2. After consent, Google returns code to redirect URI.
3. Frontend exchanges code with backend endpoint (`POST /api/drive/oauth/exchange`) including code + PKCE verifier (if implemented).
4. Backend requests tokens (access + refresh) and stores encrypted refresh token.
5. Backend returns short-lived access token (or uses server-side refresh logic for subsequent Drive calls).

## 5. Upload Process (Implemented)

### Backend API

**Endpoint**: `POST /api/attachments`

**Request**:
- Content-Type: `multipart/form-data`
- Form fields:
  - `file`: The attachment file
  - `recordType`: `expense` or `income`
  - `recordId`: UUID of the expense/income record
  - `checksum`: (Optional) SHA-256 hex string computed by client

**Validation**:
- File size: max 5MB (5,242,880 bytes)
- MIME types: PDF, images, Excel, Word documents
- Limits: max 5 attachments per record (enforced by LimitCheckService)
- Record existence: validates expense/income exists before uploading

**Response** (201 Created):
```json
{
  "id": "attachment-uuid",
  "driveFileId": "google-drive-file-id",
  "originalFilename": "receipt.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 102400,
  "checksum": "sha256-hex",
  "webViewLink": "https://drive.google.com/file/d/.../view",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file, record not found, or over attachment limit
- `401 Unauthorized`: User not authenticated
- `413 Payload Too Large`: File exceeds 5MB

### Frontend Integration

**UploadWidget Component** (`frontend/src/features/attachments/UploadWidget.tsx`):

Props:
```typescript
interface UploadWidgetProps {
  recordType: 'expense' | 'income';
  recordId: string;
  onUploadComplete?: () => void;
  maxFiles?: number; // default 5
  maxSizeBytes?: number; // default 5MB
  allowedMimeTypes?: string[]; // default: PDF, images, Excel, Word
}
```

Features:
- Multi-file selection with input[type=file, multiple]
- Client-side validation (MIME type, file size, count limit)
- Progress tracking with visual indicators
- Sequential upload processing
- SHA-256 checksum pre-computation using Web Crypto API
- Accessible UI with ARIA labels and live regions
- Error handling with user-friendly messages

**AttachmentList Component** (`frontend/src/features/attachments/AttachmentList.tsx`):

Props:
```typescript
interface AttachmentListProps {
  recordType: 'expense' | 'income';
  recordId: string;
}
```

Features:
- Fetches and displays attachments for a record
- File type icons (PDF, image, Excel, Word)
- Formatted file size and upload date
- "Open in New Tab" button for each attachment
- Empty state handling

**API Client Functions** (`frontend/src/services/api.ts`):

```typescript
// Upload attachment
uploadAttachment(
  recordType: 'expense' | 'income',
  recordId: string,
  file: File,
  checksum: string
): Promise<Attachment>

// List attachments
listAttachments(
  recordType: 'expense' | 'income',
  recordId: string
): Promise<Attachment[]>
```

**Checksum Utility** (`frontend/src/services/checksum.ts`):
```typescript
// Compute SHA-256 checksum using Web Crypto API
computeSHA256(file: File): Promise<string>
```

### Form Integration

**Expense Form** (`frontend/src/features/expenses/components/ExpenseForm.tsx`):
- After successful expense creation/update, shows "Attachments" section below form
- Displays UploadWidget with `recordType="expense"` and saved expense ID
- Upload section remains visible to allow multiple uploads
- Cancel/Clear button resets form and hides upload section

**Income Form** (`frontend/src/features/incomes/components/IncomeForm.tsx`):
- Similar integration pattern as expense form
- Shows UploadWidget after successful income save
- Upload section with `recordType="income"` and saved income ID

### Usage Flow

1. **Create/Edit Record**: User fills expense/income form and saves
2. **Form Success**: Form submits successfully, record saved to database
3. **Upload Section Appears**: UploadWidget component renders below form
4. **Select Files**: User clicks "Choose Files" button and selects up to 5 files
5. **Validation**: Client validates file count, size, and MIME types
6. **Checksum Computation**: For each file, SHA-256 checksum computed in browser
7. **Upload**: Files uploaded sequentially with progress indicators
8. **Completion**: Success message shown, upload button re-enabled for more uploads
9. **View Attachments**: User can click "Open in New Tab" to view files in Google Drive

### Logging

Service logs (AttachmentsService):
- Upload start: file name, size, record type/ID
- Checksum computed: truncated hash for debugging
- Record not found: warning with record details
- Upload complete: attachment ID, file details, user ID, duration
- List operation: debug log with attachment count

### Example Usage

```tsx
// In expense detail page
<UploadWidget
  recordType="expense"
  recordId={expense.id}
  onUploadComplete={() => {
    // Optional: refresh expense data
    queryClient.invalidateQueries(['expense', expense.id]);
  }}
/>

// Display existing attachments with actions
<AttachmentList
  attachments={attachments}
  onRefresh={() => {
    // Refetch attachments after replace/remove
    queryClient.invalidateQueries(['attachments', expense.id]);
  }}
  showActions={true} // Enable replace/remove buttons
/>
```

## 6. Replacement (Implemented)

### Backend API

**Endpoint**: `PUT /api/attachments/:id`

**Request**:
- Content-Type: `multipart/form-data`
- Form fields:
  - `file`: The replacement file
  - `checksum`: (Optional) SHA-256 hex string

**Process**:
1. User clicks "Replace" button on existing attachment
2. Frontend opens file picker, user selects new file
3. Frontend uploads new file via PUT endpoint
4. Backend:
   - Validates the replacement file (size, MIME type)
   - Uploads new file to Google Drive
   - Creates new attachment record
   - Marks old attachment with:
     - `status = REMOVED`
     - `replacedByAttachmentId = <new-attachment-id>`
     - `retentionExpiresAt = now() + 90 days`

**Response** (200 OK):
```json
{
  "id": "new-attachment-uuid",
  "filename": "updated-receipt.pdf",
  "webViewLink": "https://drive.google.com/file/.../view",
  "sizeBytes": 204800,
  "mimeType": "application/pdf"
}
```

**History Tracking**:
- Old attachment remains in database with `REMOVED` status
- `replacedByAttachmentId` links to the new version
- Retention period allows recovery if needed
- After 90 days, purge job deletes old attachment

### Frontend Integration

**AttachmentList Component** (Enhanced):

Props:
```typescript
interface AttachmentListProps {
  attachments: Attachment[];
  onRefresh?: () => void;
  showActions?: boolean; // Enable replace/remove/preview buttons
}
```

Features:
- **Preview**: Opens PreviewModal with iframe for PDFs, image display for images
- **Replace**: Hidden file input triggered by button, uploads replacement
- **Remove**: Confirmation dialog before soft delete
- **Status Badge**: Shows "Removed" badge for removed attachments
- **Loading States**: "Replacing..." and "Removing..." button states during operations

**PreviewModal Component**:

Props:
```typescript
interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: {
    id: string;
    originalFilename: string;
    mimeType: string;
    webViewLink: string;
  } | null;
}
```

Accessibility Features:
- Focus trap keeps keyboard navigation within modal
- Escape key closes modal
- Close button auto-focused on open
- ARIA labels for screen readers
- Modal backdrop closes on click

Preview Support:
- **PDF**: Embedded iframe with Google Drive viewer
- **Images**: Direct image display with responsive sizing
- **Other files**: "Open in Google Drive" button with info message

**API Client Functions** (`frontend/src/services/api.ts`):

```typescript
// Replace attachment
replaceAttachment(
  attachmentId: string,
  file: File,
  checksum?: string
): Promise<Attachment>

// Remove attachment (soft delete)
removeAttachment(
  attachmentId: string
): Promise<{ id: string; status: string; retentionExpiresAt: string }>
```

### Logging

Service logs (AttachmentsService):
- Replace start: attachment ID, new filename
- Replace complete: new attachment ID, old attachment ID, duration
- Remove start: attachment ID
- Remove complete: attachment ID, retention expiry date, duration

## 7. Removal (Soft Delete) (Implemented)

### Backend API

**Endpoint**: `DELETE /api/attachments/:id`

**Process**:
1. User clicks "Remove" button and confirms action
2. Frontend sends DELETE request to endpoint
3. Backend:
   - Validates attachment exists and is active
   - Sets `status = REMOVED`
   - Sets `retentionExpiresAt = now() + 90 days`
   - Logs removal action

**Response** (200 OK):
```json
{
  "id": "attachment-uuid",
  "status": "REMOVED",
  "retentionExpiresAt": "2024-04-15T10:30:00Z"
}
```

**Retention Policy**:
- Removed attachments remain in database for 90 days
- Google Drive file remains accessible during retention period
- After 90 days, purge job permanently deletes:
  - Database record
  - Google Drive file
- Allows recovery from accidental deletions

### Frontend Integration

- Confirmation dialog: "Are you sure you want to remove this attachment? It will be deleted after 90 days."
- Button disabled during removal operation
- Success triggers attachment list refresh
- Error handling with user-friendly messages

## 8. Bulk Import
1. User opens bulk UI; selects multiple files.
2. Frontend attempts auto-match (parse filename patterns, maybe date-amount heuristics).
3. Sends batch queue to backend; backend processes with concurrency of 3.
4. Progress streamed (optional SSE) or polled.
5. Completion summary returned.

## 9. Orphan Scan
1. Backend lists Drive files under user folder.
2. Filters those not present in Attachment table.
3. Returns list; user may link manually or delete.

## 10. Testing Strategy
- Unit: Drive provider abstraction mocked (upload, list, delete, replace).
- Contract: Supertest against attachment endpoints (valid/invalid file, over limit, replace, remove).
- E2E (Playwright): Upload + preview + replace + remove scenario.
- Performance: Benchmark upload/replace endpoints ensuring p95 latency within goal.

## 11. Security Considerations
- Refresh token encrypted at rest; avoid logging tokens.
- Validate MIME by both extension and actual file signature (phase 2 enhancement).
- Limit concurrency to mitigate abuse.
- Rate limit attachment endpoints (future enhancement).

## 12. Error Handling
| Scenario | Response |
|----------|---------|
| Over file limit | 400 with message "Maximum 5 attachments per record" |
| File too large | 413 with message "File exceeds 5MB limit" |
| Unauthorized | 401 with message "Authentication required" |
| Invalid MIME | 400 with message "Unsupported file type" |
| Drive quota | 429 with message "Storage quota exceeded" |

## 13. Retention & Purge Operations

### Retention Policy
- **Soft Delete Duration**: 90 days from removal
- **Status Transition**: `ACTIVE` → `REMOVED` (soft delete)
- **Purge Condition**: `status=REMOVED` AND `retentionExpiresAt < now()`

### Purge Cron Job
**Purpose**: Permanently delete attachments that have exceeded their 90-day retention period.

**Schedule**: Daily at 2:00 AM (configurable via `CRON_PURGE_SCHEDULE` env var)

**Implementation**: `backend/src/cron/purge-attachments.job.ts`

**Process**:
1. Query attachments: `WHERE status=REMOVED AND retentionExpiresAt < now()`
2. For each expired attachment:
   - Delete file from Google Drive
   - Delete attachment record from database
3. Log results: success count, Drive errors, DB errors, duration

**Monitoring**:
- Check logs for purge job execution: `grep "attachment purge job" logs/*.log`
- Alert on high error rates (>10% Drive errors)
- Track purge count trends (sudden spike may indicate issue)

**Manual Trigger** (for testing or one-off cleanup):
```bash
# SSH to backend server, then:
node -e "require('./dist/cron/purge-attachments.job').PurgeAttachmentsJob.prototype.handlePurge()"
```

### Orphan Scan Job
**Purpose**: Detect Google Drive files not linked to any database record (orphans).

**Schedule**: Weekly on Sunday at 3:00 AM (configurable via `CRON_ORPHAN_SCAN_SCHEDULE` env var)

**Implementation**: `backend/src/cron/orphan-scan.job.ts`

**Process**:
1. Fetch all Drive file IDs from Google Drive folder
2. Query all tracked `driveFileId` values from database
3. Compare: files in Drive but not in DB = orphans
4. Log orphan count and filenames (warn if >0)

**Remediation**:
- Review orphan list via API: `GET /api/attachments/orphans`
- **Option 1**: Adopt orphan (link to record) - use `OrphanScanService.adoptOrphan()`
- **Option 2**: Delete orphan (permanent) - use `OrphanScanService.deleteOrphan()`

**Alert Thresholds**:
- >10 orphans: Investigate bulk import failures or integration issues
- >100 orphans: Critical - possible data sync problem

## 14. Future Enhancements
- Resumable uploads for >5MB.
- Inline preview for XLSX/DOCX via Google Docs viewer iframe.
- Virus scan integration.
- Attachment tagging.

## 15. Troubleshooting

### Issue: Upload Fails with 413 (File Too Large)
**Cause**: File exceeds `ATTACHMENT_MAX_SIZE_BYTES` limit (default 5MB)  
**Solution**:
- Check file size: `ls -lh <file>`
- Compress/resize file if possible
- If legitimate need: increase limit in env vars (backend + frontend)

### Issue: 401 Unauthorized on Upload
**Cause**: JWT token expired or missing  
**Solution**:
- Frontend: Token refresh should auto-trigger, check auth store
- Backend: Verify JWT secret matches between services
- User: Re-login if session expired

### Issue: Upload Succeeds but File Not in Drive
**Cause**: GoogleDriveProvider stub implementation (placeholder)  
**Solution**:
- Check logs for "placeholder" in `driveFileId` responses
- Implement actual Drive API integration in `google-drive.provider.ts`
- Verify OAuth tokens are valid and have Drive permissions

### Issue: Bulk Import Stuck in "running" Status
**Cause**: Backend crash during processing or infinite loop  
**Solution**:
- Check backend logs for errors: `grep "Bulk job <jobId>" logs/*.log`
- Manually update job status to "failed": `UPDATE bulk_import_jobs SET status='failed' WHERE id='<jobId>'`
- Restart backend service

### Issue: Orphan Scan Times Out
**Cause**: Too many files in Drive folder (>10,000), slow API response  
**Solution**:
- Increase API timeout in `google-drive.provider.ts`
- Implement pagination for `listAllFiles()` method
- Run scan during low-traffic hours

### Issue: Purge Job Fails with Drive Errors
**Cause**: File already deleted manually, or OAuth token expired  
**Solution**:
- Check Drive API error code: `404` = already deleted (safe to skip)
- `401` = token expired → refresh OAuth token for user
- Log error, continue with database cleanup (don't block on Drive errors)

### Issue: Preview Modal Shows "Unsupported File Type"
**Cause**: File MIME type not in preview whitelist (PDF, images)  
**Solution**:
- Only PDF and images have inline preview
- For other types, use "Open in Drive" button
- Future: Add Google Docs Viewer iframe for DOCX/XLSX

### Issue: Frontend Build Size Increased by >30KB
**Cause**: New dependencies or large components  
**Solution**:
- Run bundle analyzer: `npm run build -- --analyze`
- Check for large imports (avoid importing entire libraries)
- Tree-shake unused code, lazy-load components
- Target: Keep feature delta <30KB gzipped

## 16. Runbook (Ops)
- **Purge job**: Daily cron at 2 AM queries attachments where `status=REMOVED AND retentionExpiresAt < now()`
- **Orphan scan**: Weekly job Sunday 3 AM or manual trigger via API endpoint `GET /api/attachments/orphans`
- **Token refresh**: Backend ensures valid access token prior to Drive calls; refresh failures flagged in logs
- **Monitoring**: Track purge counts, orphan trends, upload success rates, API latency (P95 <500ms target)

## 8. Bulk Import & Orphan Scan (Implemented)

### Bulk Import

**Purpose**: Upload multiple files simultaneously with optional record mapping, progress tracking, and duplicate detection.

**Backend API**:

**Endpoint**: `POST /api/attachments/bulk`

**Request**:
- Content-Type: `multipart/form-data`
- Form fields:
  - `files`: Array of files (max 50)
  - `recordType`: `expense` or `income` (applies to all files)
  - `recordIds`: Optional array of record IDs (must match files count if provided)

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "running",
    "totalFiles": 25
  }
}
```

**Check Status**: `GET /api/attachments/bulk/{jobId}`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "totalFiles": 25,
    "uploadedCount": 20,
    "duplicateCount": 3,
    "errorCount": 0,
    "skippedCount": 2,
    "startedAt": "2024-01-15T10:00:00Z",
    "completedAt": "2024-01-15T10:02:30Z"
  }
}
```

**Cancel Job**: `PATCH /api/attachments/bulk/{jobId}`

**Implementation Details**:
- **Concurrency Control**: Processes 3 files in parallel (configurable via `CONCURRENCY_LIMIT`)
- **Duplicate Detection**: Uses SHA-256 checksum cache to skip duplicate files within same job
- **Progress Tracking**: Updates `uploadedCount`, `duplicateCount`, `errorCount`, `skippedCount` in database
- **Mapping Heuristics**: (Optional) Suggests record matches based on filename patterns (date, amount, keywords)
- **Logging**: Logs job lifecycle events (start, batch progress, completion, errors)

**Frontend Components**:

**BulkImportPanel**:
```tsx
import { BulkImportPanel } from '@/features/attachments/BulkImportPanel';

<BulkImportPanel 
  recordType="expense"
  onComplete={() => console.log('Bulk import completed')}
/>
```

Features:
- File selection (multi-file input)
- Optional record mapping UI (`BulkMappingSuggestions`)
- Real-time progress display (`BulkProgress`)
- Auto-polling job status every 2 seconds
- Completion/error notifications

**BulkProgress**:
- Displays job status with color-coded indicators
- Progress bar showing percentage completed
- Statistics: uploaded, duplicates, errors, skipped
- Success/failure messages

**BulkMappingSuggestions**:
- Lists selected files with record ID input fields
- Optional: Shows mapping suggestions based on filename analysis
- Files without recordId are skipped during processing

### Orphan Scan

**Purpose**: Detect Google Drive files not linked to any database record (orphaned files).

**Backend API**:

**Endpoint**: `GET /api/attachments/orphans`

**Response**:
```json
{
  "success": true,
  "data": {
    "orphans": [
      {
        "driveFileId": "1abc...xyz",
        "originalFilename": "receipt-2024.pdf",
        "sizeBytes": 102400,
        "detectedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

**Implementation Details**:
- Fetches all Drive file IDs from Google Drive folder
- Compares with tracked `Attachment` records in database
- Returns files in Drive but not in database (orphans)
- Logs scan duration and orphan count

**Remediation Options** (Backend Service Methods):
- `deleteOrphan(driveFileId)`: Permanently removes orphan file from Drive
- `adoptOrphan(driveFileId, recordType, recordId)`: Creates Attachment record to link orphan to a record

**Frontend Component**:

**OrphanList**:
```tsx
import { OrphanList } from '@/features/attachments/OrphanList';

<OrphanList />
```

Features:
- Scans for orphans on mount
- Refresh button to re-scan
- Displays orphan list with filename, size, detection timestamp
- Empty state when no orphans found

**API Functions** (`frontend/src/services/api.ts`):
```typescript
// Start bulk import
await startBulkImport('expense', files, ['id1', 'id2', undefined]);

// Check job status
const job = await getBulkJobStatus(jobId);

// Get orphan list
const orphans = await getOrphans();
```

## 15. Module & Path Reference (Scaffolded in Phase 1)

Backend:
```
backend/src/modules/attachments/attachments.module.ts
backend/src/modules/attachments/attachments.controller.ts
backend/src/modules/attachments/attachments.service.ts
backend/src/modules/attachments/bulk.controller.ts
backend/src/modules/attachments/bulk.service.ts
backend/src/modules/attachments/bulk-mapping.util.ts
backend/src/modules/attachments/orphan-scan.service.ts
backend/src/modules/attachments/providers/drive.provider.ts
backend/src/modules/attachments/providers/google-drive.provider.ts
backend/src/modules/attachments/attachment.constants.ts
backend/src/common/utils/checksum.ts
```

Frontend:
```
frontend/src/features/attachments/UploadWidget.tsx
frontend/src/features/attachments/AttachmentList.tsx
frontend/src/features/attachments/PreviewModal.tsx
frontend/src/features/attachments/BulkImportPanel.tsx
frontend/src/features/attachments/BulkProgress.tsx
frontend/src/features/attachments/BulkMappingSuggestions.tsx
frontend/src/features/attachments/OrphanList.tsx
frontend/src/services/api.ts
```

These placeholders will be expanded in Foundational & User Story phases.


