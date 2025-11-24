# Implementation Plan: Google Drive Document Storage Integration

**Branch**: `001-drive-docs` | **Date**: 2025-11-22 | **Spec**: [/specs/001-drive-docs/spec.md]
**Input**: Feature specification from `/specs/001-drive-docs/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Introduce secure, private per-user Google Drive document storage for expenses and incomes supporting up to 5 attachments (pdf/png/jpeg/jpg/xlsx/docx, ≤5MB each) per record. Backend (NestJS + Prisma) stores only references & metadata (no BLOB). Google Drive files receive custom properties for search/reconciliation. Provide CRUD for attachments (upload, list, preview link, replace, soft delete with 7-day retention), and a bulk import/sync process detecting orphans. OAuth flow: user consent (three-legged) with offline access (refresh token) — NOTE: Google Drive does not support a pure client credentials flow; requirement interpreted as using OAuth Web app credentials (client id/secret) with user-scoped authorization. Security: private visibility; performance budgets preserved (<10% p95 latency delta). Testing: Vitest unit/contract + Playwright E2E for upload journey. Accessibility: clear error states, focus management in preview modals.

## Technical Context

**Language/Version**: TypeScript 5.9 (Node.js LTS 20+), React 19, NestJS 11  
**Primary Dependencies**: NestJS core, Prisma, Google APIs (Drive v3) [to add], class-validator, multer (upload handling), TanStack Query/Router, React Hook Form  
**Storage**: PostgreSQL (Prisma) for attachment metadata; Google Drive for binary documents (per-user folder)  
**Testing**: Vitest (backend unit/contract + frontend component), Playwright (E2E P1 upload & manage), Supertest for REST contracts  
**Target Platform**: Linux containers (Docker Compose: Postgres + Keycloak + backend + frontend)  
**Project Type**: Web application (backend + frontend split)  
**Performance Goals**: Upload metadata persist < 5s for 95% ≤5MB files; replace < 3s; no backend p95 latency endpoint increase >10%; bundle size delta < 30KB net (lazy-load attachment UI)  
**Constraints**: Max 5 attachments/record; file size ≤5MB; private visibility; soft-delete retention 7 days; no binary DB storage; Drive quota usage monitored; OAuth tokens securely stored (encrypted or hashed refresh token pointer)  
**Scale/Scope**: Initial target ≤10k attachments; design scalable to 100k via indexing (recordId + createdAt) and Drive folder sharding if needed.

NEEDS CLARIFICATION (none outstanding — all resolved in spec; OAuth flow clarified as user consent + refresh token, not client credentials). If pure client credentials is insisted, must switch to Service Account which conflicts with per-user private visibility.

## Constitution Check

Pre-design gate assessment:
- Principle I (Code Quality): New backend module will follow NestJS module pattern (`attachments.module.ts`, service, controller, DTOs, JSDoc). ✅
- Principle II (Testing): Plan includes Vitest unit, contract tests; Playwright E2E for P1; coverage goals aligned. ✅
- Principle III (UX & Accessibility): Attachment UI will reuse existing layout components, modals with focus trap; error messaging plain language; preview accessible. ✅
- Principle IV (Performance): Budgets defined (<10% p95 impact, upload latency targets, bundle size delta <30KB). ✅
No violations; proceed to Phase 0 (research) — minimal since clarifications done.

Post-design re-evaluation:
- Artifacts created: `research.md`, `data-model.md`, `contracts/attachments.openapi.yaml`, `quickstart.md`.
- Data model enforces privacy and performance constraints (indexes, size checks) — aligns with Principle IV & I.
- Contracts specify error codes (400/413/429) enabling clear UX messages — aligns with Principle III.
- Testing plan unchanged; provider abstraction ensures mockability — Principle II.
- No new complexity introduced (no extra services or modules beyond planned) — Principle I.
Status: All gates still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

```text
backend/
  src/
    modules/
      attachments/          # NEW (controller, service, dto, module)
      expenses/
      incomes/
      reports/
      ...
    common/                 # Existing guards/interceptors (extend for auth scopes)
    prisma/                 # Prisma service
  migrations/               # New migration V2.5.0__attachments.sql (planned)
frontend/
  src/
    features/
      attachments/          # NEW (AttachmentList, UploadWidget, PreviewModal)
      expenses/
      incomes/
      reports/
    services/
      api.ts                # Extend with attachment endpoints
      google-drive.ts       # NEW (client wrapper abstraction; lazy loaded)
    stores/
      auth.ts               # Reuse for tokens; extend for drive auth state if needed
    components/layout/
  tests/
    e2e/                    # Playwright (add attach flow test)
    unit/                   # Vitest component tests
    contract/               # Backend contract tests (attachments endpoints)
```

**Structure Decision**: Extend existing modular NestJS and feature-based React structure; introduce dedicated `attachments` backend module and `features/attachments` frontend folder. Google Drive integration isolated in `services/google-drive.ts` (frontend) and `attachments.service.ts` (backend) to preserve separation of concerns and maintainability.

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | N/A | Existing architecture sufficient; no principle violations |
