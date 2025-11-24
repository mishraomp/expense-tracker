# ADR: Resumable Uploads

## Status
**Deferred** - Not implemented in MVP (Phase 1-6)

## Context
Current scope restricts file attachments to ≤5MB with simple multipart upload. For larger files (e.g., >10MB), resumable uploads provide:
- **Reliability**: Resume interrupted uploads without starting over
- **Performance**: Handle network instability and timeouts gracefully
- **User Experience**: Progress tracking for long-running uploads

Google Drive API supports [resumable upload sessions](https://developers.google.com/drive/api/guides/manage-uploads#resumable) for files >5MB.

## Decision
**Defer** implementation of resumable uploads to future iterations. Current MVP uses simple multipart uploads with:
- File size limit: 5MB (enforced via `ATTACHMENT_MAX_SIZE_BYTES`)
- Single HTTP POST request with `multipart/form-data`
- No session state tracking required

### When to Reconsider
Implement resumable uploads if:
1. User feedback indicates frequent upload failures (network instability)
2. Business requirements change to support larger files (>10MB)
3. Bulk import experiences high error rates for large files

### Future Design Approach
If implemented, use Google Drive's resumable upload protocol:
1. **Session Initiation**: POST to Drive API with file metadata → receive upload URL
2. **Chunk Upload**: PUT file chunks (e.g., 256KB blocks) to upload URL
3. **Progress Tracking**: Store session state in database (`BulkImportJob` or `AttachmentUploadSession`)
4. **Resume Logic**: On failure, query session status, resume from last successful byte
5. **Finalization**: Mark complete in database, create Attachment record

## Consequences

### Positive (Current Decision)
- Simpler implementation (no session state management)
- Lower complexity (no chunk upload logic)
- Acceptable for MVP scope (5MB sufficient for receipts, invoices, small PDFs)
- Faster time-to-market

### Negative (Current Decision)
- Cannot handle large files (videos, high-res scans >5MB)
- No resume capability (full re-upload on network failures)
- May need refactor if requirements change

### Positive (If Implemented)
- Supports large files (videos, archives, bulk scans)
- Better reliability (resume interrupted uploads)
- Enhanced user experience (progress indicators)

### Negative (If Implemented)
- Increased complexity (session state, chunk management)
- Additional database schema (upload sessions)
- Performance overhead (multiple API calls per file)

## Alternatives Considered

### 1. Always Use Resumable Uploads (Even for Small Files)
**Pros**: Uniform code path, future-proof  
**Cons**: Unnecessary overhead (2-3x API calls) for small files, added complexity  
**Decision**: Rejected - YAGNI principle, optimize for common case

### 2. Client-Side Chunking + Multiple Multipart Uploads
**Pros**: No server-side session state  
**Cons**: Complex frontend logic, poor user experience (multiple retries), inefficient  
**Decision**: Rejected - worse than resumable upload API, reinventing wheel

### 3. Increase File Size Limit Without Resumable Uploads
**Pros**: Simple extension of current approach  
**Cons**: Higher risk of timeout/failure for large files, poor reliability  
**Decision**: Rejected - increases failure rate without solving root cause

## Implementation Notes (If Revisited)
- Use `googleapis` library's resumable upload methods
- Store session metadata in `AttachmentUploadSession` table:
  - `sessionId`, `userId`, `filename`, `uploadUrl`, `bytesUploaded`, `totalBytes`, `status`
- Implement retry logic with exponential backoff
- Add progress callbacks for frontend integration
- Consider timeout thresholds (e.g., abandon sessions >24 hours old)

## References
- [Google Drive API: Manage Uploads](https://developers.google.com/drive/api/guides/manage-uploads)
- [Google Drive API: Resumable Upload Protocol](https://developers.google.com/drive/api/guides/manage-uploads#resumable)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

## Related Decisions
- ADR: Token Encryption (security for OAuth credentials)
- Research: File Size Limits (5MB rationale)
