# Implementation Plan: Add GST and PST taxes to expenses and line items

**Branch**: `001-add-gst-pst` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-add-gst-pst/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**Primary Requirement**: Add optional GST and PST tax fields (rates and calculated amounts) to both `Expense` and `ExpenseLine` entities, persisting them in PostgreSQL, calculating totals with exclusive-tax mode (tax on top of subtotal), and exposing via API DTOs and UI forms.

**Technical Approach**: 
1. Create `TaxDefaults` table in PostgreSQL to store system-wide (or user/region-specific) default GST and PST rates.
2. Add boolean columns `gst_applicable` and `pst_applicable` to `expenses` and `expense_items` tables (instead of explicit rate fields).
3. Migrate Flyway SQL: add columns, create TaxDefaults entity with default rates, populate initial defaults.
4. Update Prisma schema: add new fields and relation to TaxDefaults; add computed fields for rate/amount lookups.
5. Implement backend service logic: when `gst_applicable=true`, fetch default rate, calculate amount; same for PST. Automatic aggregation from lines to expense.
6. Update frontend: checkbox inputs for "Apply GST" / "Apply PST" (no manual rate entry); show calculated amounts and totals.
7. Ensure tests cover checkbox toggles, default rate application, and calculation accuracy.

## Technical Context

**Language/Version**: Backend: NestJS 11, TypeScript 5.x; Frontend: React 19, TypeScript 5.x  
**Primary Dependencies**: Backend: Prisma 7.x, PostgreSQL, class-validator, class-transformer; Frontend: TanStack Query 5, TanStack Router 1, React Hook Form, Bootstrap 5  
**Storage**: PostgreSQL (Flyway migrations in `backend/migrations/`)  
**Testing**: Backend: Vitest 4.x (unit, contract in `backend/tests/`); Frontend: Vitest 4.x + Playwright E2E (`frontend/e2e/`)  
**Target Platform**: Full-stack web application (NestJS API + React SPA)  
**Project Type**: Web (monorepo with `backend/` and `frontend/` folders)  
**Performance Goals**: API create/update expense < 800ms p95; CSV import/export < 5s for typical batch; UI forms render < 300ms; E2E tests complete < 30s each  
**Constraints**: Bundle size < 250KB gzipped (frontend); backend queries < 400ms p95 for reads; no N+1 queries; memory growth < 10% per PR  
**Scale/Scope**: Add 4 new fields per entity; 2 new DTOs (for expense, for line); ~200 lines backend logic; ~150 lines frontend UI; ~50 test cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality & Maintainability** | ✅ PASS | TypeScript strict mode enforced; class-validator DTOs for input validation; new service methods require JSDoc; no cyclic dependencies. Tax calculation logic isolated in service with clear interface. |
| **II. Test Discipline & Coverage** | ✅ PASS (with E2E requirement) | Unit tests for tax calculation (TDD: write failing tests first); contract tests for API endpoints (status codes, response schemas); E2E tests MANDATORY for expense CRUD flows with taxes (new requirement per constitution v1.2.0). Target: backend ≥85% lines, ≥75% branches on tax logic; frontend critical (forms, hooks) ≥80%. |
| **III. UX Consistency & Accessibility** | ✅ PASS | Forms use React Hook Form + Bootstrap 5 utilities (no inline styles); tax breakdown shown in existing form layout; WCAG AA check (contrast, keyboard nav, focus indicators); reuse `frontend/src/components/form/` patterns. |
| **IV. Performance & Efficiency** | ✅ PASS | Tax calculation is O(n) on line count (no N+1); Prisma query includes should be optimized; bundle impact from form additions < 5KB; no new polling or WebSocket required. E2E tests must complete < 30s. |

**Gate Result**: ✅ **PASS** — Feature aligns with all constitution principles. No violations. Two clarifications remain (tax-rate source, rounding strategy) but do not block design phase.

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

```text
backend/
├── src/
│   ├── modules/
│   │   ├── expenses/
│   │   │   ├── dto/
│   │   │   │   ├── create-expense.dto.ts (UPDATE: add gst_rate, pst_rate)
│   │   │   │   ├── update-expense.dto.ts (UPDATE)
│   │   │   │   └── expense-response.dto.ts (UPDATE: add gst_amount, pst_amount)
│   │   │   ├── entities/
│   │   │   │   └── expense.entity.ts (REVIEW: Prisma-generated)
│   │   │   ├── expenses.service.ts (UPDATE: tax calculation logic)
│   │   │   └── expenses.controller.ts (UPDATE: docstring for tax fields)
│   │   └── [other modules unchanged]
│   └── [other]
├── prisma/
│   └── schema.prisma (UPDATE: add new fields to Expense and ExpenseLine)
├── migrations/
│   └── V3.0.0__add_gst_pst_taxes.sql (NEW: Flyway migration)
└── tests/
    ├── unit/
    │   └── expenses/
    │       └── tax-calculation.spec.ts (NEW)
    └── contract/
        └── expenses.tax.spec.ts (NEW)

frontend/
├── src/
│   ├── features/
│   │   └── expenses/
│   │       ├── components/
│   │       │   └── ExpenseForm.tsx (UPDATE: add tax input fields)
│   │       ├── types/
│   │       │   └── expense.ts (UPDATE: add tax types)
│   │       └── api/
│   │           └── expenses.api.ts (UPDATE: include tax fields in payloads)
│   ├── stores/
│   │   └── [no changes for auth/drive stores]
│   └── styles/
│       └── theme.scss (REVIEW: ensure tax input styling available)
├── tests/
│   ├── unit/
│   │   └── features/expenses/ (UPDATE: forms, hooks with taxes)
│   └── e2e/
│       ├── tests/
│       │   └── expenses.tax.spec.ts (NEW: full CRUD flows with taxes)
│       └── helpers/
│           └── [reuse existing auth, fixtures]
└── [other]

```

**Structure Decision**: Web monorepo with backend (NestJS) and frontend (React). Feature adds fields to existing `Expense` and `ExpenseLine` entities (no new services/modules needed). Updates are localized to DTOs, service logic, UI forms, API calls, and tests. No new layout components or routing required.

## Complexity Tracking

> **No Constitution Check violations.** All updates align with code quality, test discipline, UX consistency, and performance principles.

---

## Deliverables (by Phase)

### Phase 0: Research (if clarifications remain)
- Clarification Q2 (tax-rate source): **RESOLVED** — Per-record explicit + optional global defaults. Rates stored on expense/line; system may provide defaults (config optional in Phase 1 design).
- Clarification Q3 (rounding strategy): **RESOLVED** — Round per-total. Compute exact per-line taxes, sum, round final expense totals to 2 decimals.
- **Output**: None—clarifications resolved; proceed directly to Phase 1 design.

### Phase 1: Design & Contracts
- **Outputs**:
  - `data-model.md` — Entity schema, field types, validation rules
  - `contracts/` — Example API payloads (create/update/response)
  - `quickstart.md` — Dev setup for testing the feature locally
  - Updated agent context (add tax-related tech keywords)

### Phase 2: Task Breakdown & Execution
- **Outputs** (from `/speckit.tasks`):
  - `tasks.md` — Detailed task list (DB migration, DTOs, service, UI, tests, review)
  - Individual tasks track progress and dependencies

---

**Next**: Confirm decisions for Q2 and Q3, then proceed to Phase 1 design.