# Research: Google Drive Document Storage Integration

## Decisions & Rationale

### OAuth Flow Choice
- **Decision**: Use standard OAuth 2.0 "Installed/Web Application" flow with user consent and offline access (refresh tokens) rather than client credentials.
- **Rationale**: Google Drive does not support pure client credentials for per-user private file access; service accounts would break per-user isolation (shared identity). Offline access allows background retention cleanup.
- **Alternatives Considered**: Service Account (would require shared folder and ACL layering); Implicit flow (deprecated, no refresh tokens); Pure client credentials (unsupported) -> rejected.

### Folder Strategy
- **Decision**: Root app folder `ExpenseTracker` + per-user subfolder named by stable Keycloak user ID / subject.
- **Rationale**: Keeps documents segregated; simplifies orphan detection; avoids path collisions.
- **Alternatives**: Single flat folder (scales poorly); hashed partitioning (premature optimization).

### Metadata Strategy
- **Decision**: Use Drive file `properties` for: `recordType`, `recordId`, `recordDate`, `amountMinorUnits`, `categoryId`, `checksum`.
- **Rationale**: Enables search, reconciliation, orphan scan, replacement detection.
- **Alternatives**: Only DB metadata (loses Drive-side query ability); filename encoding (fragile, collisions).

### Upload Handling
- **Decision**: Start with simple multipart upload (<5MB) synchronous; consider resumable for future >5MB use cases.
- **Rationale**: Scope limit; reduces complexity while meeting current file size constraint.
- **Alternatives**: Resumable/Chunked now (unnecessary overhead); background worker pipeline (premature).

### Soft Delete Retention
- **Decision**: Mark DB status `removed` + schedule purge with daily job; compute `retentionExpiresAt` at removal time.
- **Rationale**: User safety; rollback window.
- **Alternatives**: Immediate deletion (risk of accidental loss); configurable window (adds complexity early).

### Search & Orphan Detection
- **Decision**: Query Drive for files with app root parent but missing corresponding DB `driveFileId`; treat as orphan.
- **Rationale**: Ensures reconciliation of network interruptions or historical manual uploads.
- **Alternatives**: Trust DB only (hidden lost files); periodic local cache indexing (unneeded now).

### Security & Privacy
- **Decision**: Private per-user; Drive permissions default (no sharing). Refresh token stored encrypted (future secret storage enhancement).
- **Rationale**: Minimizes data exposure; adheres to spec requirement.
- **Alternatives**: Shared workspace (breaks privacy); domain-wide delegation (excessive for personal finance app).

### Performance Safeguards
- **Decision**: Limit concurrent uploads in bulk to 3 at a time to keep CPU/memory bounded and latency thresholds safe.
- **Rationale**: Prevents saturating network or event loop; maintains p95 budgets.
- **Alternatives**: Full parallel (risk spikes); purely sequential (slower UX).

### Testing Approach
- **Decision**: Abstract Drive calls behind a provider interface enabling Vitest mocking; E2E uses stub credentials with test Drive sandbox (or local fake if CI restrictions).
- **Rationale**: Deterministic tests; prevents external dependency flakiness.
- **Alternatives**: Live Drive calls in CI (flaky quotas); partial mocking (incomplete isolation).

## Open Risks
- ~~Refresh token storage security (need encryption layer / secret manager).~~ ✅ RESOLVED: Implemented AES-256-GCM encryption (Phase 6, T106)
- Drive API quota (future scaling monitoring needed).
- XLSX/DOCX preview complexity (initially open in Drive new tab; inline preview deferred).

## Performance Validation (Phase 6)

### Benchmark Results
**Test Configuration**:
- Environment: Local development (localhost:3000)
- File Size: 100KB binary files
- Iterations: 50 uploads per test
- Concurrency: 5 parallel uploads (bulk test)

**Measured Metrics** (Target vs. Actual):
| Metric | Target | Sequential | Concurrent (5x) | Status |
|--------|--------|------------|-----------------|--------|
| P50 Latency | <200ms | TBD | TBD | ⏳ Pending |
| P95 Latency | <500ms | TBD | TBD | ⏳ Pending |
| P99 Latency | <1000ms | TBD | TBD | ⏳ Pending |
| Throughput | >10 req/s | TBD | TBD | ⏳ Pending |

**Notes**:
- Run benchmark with: `npm run benchmark:attachments` (requires `BENCHMARK_TOKEN` env var)
- Production performance will vary based on Drive API latency and network conditions
- Add monitoring for P95 latency in production (target: <500ms)

### Bundle Size Impact (Frontend)
**Target**: Keep feature delta <30KB gzipped

**Measured** (vs. baseline before feature):
- Baseline: TBD KB (before attachments feature)
- With Feature: TBD KB (after Phase 6)
- Delta: TBD KB
- Status: ⏳ Pending measurement (use `npm run build -- --analyze`)

**Dependencies Added**:
- React hooks (useState, useEffect, useRef) - already in project
- No new external libraries required
- Components: ~8 new files (UploadWidget, AttachmentList, PreviewModal, BulkImportPanel, etc.)

## Security Review Checklist (Phase 6)

### ✅ Implemented Protections
- [x] **OAuth Token Encryption**: AES-256-GCM for refresh tokens at rest
- [x] **HTTPS Only**: Enforce TLS for all API calls (production requirement)
- [x] **JWT Authentication**: Keycloak integration for user identity
- [x] **File Size Limits**: 5MB max per file (prevent DoS)
- [x] **MIME Type Validation**: Whitelist of allowed types (PDF, images, CSV)
- [x] **Attachment Count Limits**: Max 5 per record (prevent abuse)
- [x] **Input Sanitization**: File validation interceptor, checksum verification
- [x] **Soft Delete with Retention**: 90-day recovery window before permanent purge
- [x] **Logging & Monitoring**: Structured logs with request IDs, user IDs, duration
- [x] **Error Handling**: No sensitive data in error messages (sanitized responses)

### ⏳ Pending / Future Enhancements
- [ ] **Virus Scanning**: Integrate with ClamAV or Google Safe Browsing API
- [ ] **Rate Limiting**: Per-user upload rate limits (prevent abuse)
- [ ] **CSRF Protection**: Add CSRF tokens for state-changing operations
- [ ] **Content Security Policy**: Configure CSP headers for preview modal
- [ ] **Audit Logging**: Separate audit trail for compliance (who deleted what, when)
- [ ] **Key Rotation**: Automated `ENCRYPTION_KEY` rotation procedure
- [ ] **Secret Management**: Migrate to HashiCorp Vault or AWS Secrets Manager

### 🔒 Production Deployment Checklist
- [ ] Set `ENCRYPTION_KEY` env var (generate with `openssl rand -hex 32`)
- [ ] Enable HTTPS/TLS for all endpoints (no HTTP allowed)
- [ ] Configure Google OAuth redirect URI for production domain
- [ ] Set up monitoring alerts (upload failures >5%, orphan count >10)
- [ ] Enable database encryption at rest (PostgreSQL TDE or cloud provider encryption)
- [ ] Configure backup retention for Google Drive folder
- [ ] Document incident response procedure (token compromise, data breach)
- [ ] Perform penetration testing (OWASP Top 10 validation)

### Known Vulnerabilities & Mitigations
| Risk | Severity | Mitigation | Status |
|------|----------|-----------|--------|
| Token exposure in logs | Medium | Sanitize logs, never log `ENCRYPTION_KEY` | ✅ Implemented |
| IDOR (Insecure Direct Object Reference) | High | Verify ownership before delete/replace | ⚠️ **TODO**: Add ownership checks |
| XSS in preview modal | Low | Iframe sandboxing, CSP headers | ⏳ Partial (iframe used) |
| Drive API quota exhaustion | Medium | Rate limiting, caching, quota monitoring | ⏳ Pending |
| Lost encryption key | Critical | Document backup procedures, key escrow | ⏳ Pending |

**Priority Actions**:
1. **HIGH**: Implement ownership verification in AttachmentsController (prevent IDOR)
2. **MEDIUM**: Add rate limiting per user (prevent abuse)
3. **MEDIUM**: Set up quota monitoring alerts for Drive API

## Follow-Up ADRs Suggested
- ✅ ADR: Token storage encryption strategy. **COMPLETED** (adr-token-encryption.md)
- ✅ ADR: Transition to resumable uploads for >5MB future requirement. **COMPLETED** (adr-resumable-uploads.md - deferred)
- ADR: Service Account hybrid for admin auditing (if later introduced).

## No Outstanding Clarifications
All spec clarifications resolved; no NEEDS CLARIFICATION items remain.
