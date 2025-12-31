# GST/PST Tax Feature - Complete Documentation Index

**Feature**: 001-add-gst-pst  
**Branch**: `001-add-gst-pst`  
**Status**: Phase 2 Complete ✅ (Ready for Phase 3: Implementation)  
**Date**: 2025-12-14

---

## Quick Navigation

### 📋 Core Documents (Read in Order)

1. **[spec.md](./spec.md)** ⭐
   - User stories (3 priorities: P1, P2, P3)
   - Functional requirements (FR-001 through FR-008)
   - Success criteria and assumptions
   - **Start here** if you need to understand *what* we're building

2. **[plan.md](./plan.md)**
   - Technical approach (checkbox-based with TaxDefaults table)
   - Project structure and dependencies
   - Constitution check (all 4 principles PASS)
   - **Read this** for technical overview

3. **[data-model.md](./data-model.md)** 
   - Entity definitions (Expense, ExpenseLine, TaxDefaults)
   - Flyway migration SQL (V3.0.0)
   - Prisma schema updates
   - Calculation rules and edge cases
   - **Reference this** when implementing database changes

4. **[contracts/api.md](./contracts/api.md)**
   - Example API payloads (request/response)
   - Error scenarios
   - Field descriptions
   - **Validate API contract** against this before implementation

5. **[tasks.md](./tasks.md)** ⭐⭐⭐
   - 24 actionable tasks broken down by phase and user story
   - Checklist format with file paths and acceptance criteria
   - Dependency graph and parallel execution examples
   - **Start Phase 3 implementation from here**

### 📚 Supporting Documents

- **[DESIGN_UPDATE.md](./DESIGN_UPDATE.md)** — Before/after design comparison, principles alignment
- **[PHASE_2_COMPLETION.md](./PHASE_2_COMPLETION.md)** — Task generation report, metrics, completion summary
- **[quickstart.md](./quickstart.md)** — Local dev setup, manual testing, troubleshooting

---

## Feature Summary

### What We're Building

Add optional GST and PST tax tracking to expenses and line items with:
- **Checkbox-based applicability**: Users toggle "Apply GST" / "Apply PST" instead of entering rates
- **System-wide defaults**: GST 5%, PST 7% stored in `TaxDefaults` table (no per-record rates)
- **Automatic calculation**: Backend computes amounts from defaults; frontend displays results
- **Line aggregation**: Expense-level taxes = sum of line-level taxes
- **CSV support**: Import/export includes tax columns

### Why This Design?

✅ **Simpler UX**: Checkboxes vs. numeric inputs  
✅ **No duplication**: Single source of truth for rates  
✅ **Automatic calculations**: No manual math in UI  
✅ **Smaller payloads**: Booleans < decimals in JSON  
✅ **Extensible**: Region/user-specific overrides in Phase 2  

---

## Implementation Roadmap

### Phase 1: Setup & Database ✅ (Complete)
**Status**: Design finalized; ready to code

- [ ] Flyway migration V3.0.0 (T001)
- [ ] Prisma schema update (T002)

**Timeline**: 1 day

### Phase 2: Backend Infrastructure ⏳ (Ready to Start)
**Status**: Design complete; Task T001 blocks start

- [ ] TaxCalculationService (T003)
- [ ] DTOs (T004)
- [ ] ExpensesService integration (T005)
- [ ] Controller docs (T008)
- [ ] Unit tests (T006)
- [ ] Contract tests (T007)

**Timeline**: 1.5 days (some parallel)

### Phase 3: User Story 1 - Expense-level Taxes ⏳ (Ready After Phase 2)
**Status**: Tasks ready in tasks.md (T006-T013)

- [ ] Frontend types (T009)
- [ ] Frontend API service (T010)
- [ ] Frontend form (T011)
- [ ] Frontend unit tests (T012)
- [ ] E2E basics (T013)

**Timeline**: 2 days

### Phase 4: User Story 2 - Line-item Taxes ⏳ (Ready After Phase 3)
**Status**: Tasks ready in tasks.md (T014-T020)

- [ ] Line tax calculation (T014)
- [ ] Line service (T015)
- [ ] Line form (T018)
- [ ] Line tests & E2E (T016, T017, T019, T020)

**Timeline**: 2 days

### Phase 5: User Story 3 - CSV Import/Export ⏳ (Can Start Anytime)
**Status**: Independent; tasks ready in tasks.md (T021-T023)

- [ ] CSV export (T021)
- [ ] CSV import (T022)
- [ ] Round-trip test (T023)

**Timeline**: 1 day

### Phase 6: Quality Assurance & Polish ⏳ (Final Gate)
**Status**: Gate checklist in tasks.md (T024)

- [ ] Full test suite (coverage ≥85% backend, ≥80% frontend)
- [ ] Lint & format (0 errors/warnings)
- [ ] Bundle size (< 250KB gzipped)
- [ ] Performance (< 800ms API, < 30s E2E)

**Timeline**: 0.5 days

**Total Estimate**: 5-7 days (or 3-4 with parallelization)

---

## File Structure

```
specs/001-add-gst-pst/
├── spec.md                          ← Feature specification (user stories, requirements)
├── plan.md                          ← Implementation plan (tech approach, structure)
├── data-model.md                    ← Database schema, Flyway SQL, Prisma updates
├── tasks.md                         ← Task breakdown (24 tasks, 6 phases) ⭐⭐⭐
├── DESIGN_UPDATE.md                 ← Design rationale & principles alignment
├── PHASE_2_COMPLETION.md            ← Task generation report & metrics
├── quickstart.md                    ← Dev setup & manual testing guide
├── contracts/
│   └── api.md                       ← API request/response examples
├── checklists/
│   └── requirements.md              ← Validation checklist
└── README.md                        ← This file

Implementation starts in backend/ and frontend/ per tasks.md directions
```

---

## Key Concepts

### Checkbox-Based Applicability

Instead of entering tax rates per expense, users toggle checkboxes:

```typescript
// Request (checkbox-based)
{
  "amount": 100,
  "gstApplicable": true,    // ← Checkbox: apply default?
  "pstApplicable": true
}

// Response (auto-calculated)
{
  "subtotal": 100,
  "gstRate": 5.00,          // ← From system defaults
  "gstAmount": 5.00,        // ← Computed: 100 * 5% = 5
  "pstRate": 7.00,
  "pstAmount": 7.00,
  "total": 112.00           // ← Exclusive: tax on top
}
```

### System Defaults (TaxDefaults Table)

```sql
CREATE TABLE tax_defaults (
  gst_rate DECIMAL(5,2) = 5.00,      -- GST default for Canada
  pst_rate DECIMAL(5,2) = 7.00,      -- PST default for Canada
  is_default BOOLEAN = true,          -- Only one system default
  region VARCHAR(10) NULL,            -- Phase 2: region-specific
  user_id UUID NULL                   -- Phase 2: user-specific
);
```

### Line Aggregation

Expense-level taxes = sum of line-level taxes:

```typescript
Expense {
  gstAmount: 5.00     // = LineA.gstAmount (2.50) + LineB.gstAmount (2.50)
  pstAmount: 7.00     // = LineA.pstAmount (3.50) + LineB.pstAmount (3.50)
}
```

---

## Success Criteria

### Functional ✅
- 100% of expenses with tax flags persist correct amounts
- CSV export/import preserves tax columns
- UI shows tax breakdown for 100% of tax-enabled expenses

### Quality ✅
- Backend: ≥85% line coverage, ≥75% branch coverage (tax logic)
- Frontend: ≥80% critical logic (forms)
- E2E: 100% of tax CRUD workflows tested
- Lint: 0 errors, 0 warnings
- Performance: < 800ms p95 (API), < 30s (E2E tests), < 250KB (bundle)

---

## Constitution Principles Alignment

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | TypeScript strict, class-validator DTOs, isolated tax service |
| **II. Test Discipline** | ✅ PASS | Unit + contract + E2E tests mandatory; TDD approach |
| **III. UX Consistency** | ✅ PASS | Checkboxes (simple), Bootstrap (consistent), WCAG AA (accessible) |
| **IV. Performance** | ✅ PASS | O(n) calculation, no N+1 queries, < 250KB bundle |

---

## How to Get Started

### For New Developers
1. Read **[spec.md](./spec.md)** (understand user stories)
2. Read **[plan.md](./plan.md)** (understand technical approach)
3. Read **[tasks.md](./tasks.md)** (find your first task)
4. Open **[data-model.md](./data-model.md)** (reference while coding)
5. Validate against **[contracts/api.md](./contracts/api.md)** (API contract)

### For Code Review
1. Check **[tasks.md](./tasks.md)** (verify all tasks complete)
2. Validate **[data-model.md](./data-model.md)** (schema correct)
3. Test **[contracts/api.md](./contracts/api.md)** (contract honored)
4. Review **[PHASE_2_COMPLETION.md](./PHASE_2_COMPLETION.md)** (metrics met)

### For Troubleshooting
1. Check **[quickstart.md](./quickstart.md)** (dev setup issues)
2. Review **[DESIGN_UPDATE.md](./DESIGN_UPDATE.md)** (design rationale)
3. Reference **[data-model.md](./data-model.md)** edge cases section

---

## Questions?

Refer to the appropriate document:

| Question | Document |
|----------|----------|
| What are the user stories? | [spec.md](./spec.md) |
| How do taxes work technically? | [plan.md](./plan.md) |
| What's the database schema? | [data-model.md](./data-model.md) |
| What's the API contract? | [contracts/api.md](./contracts/api.md) |
| What task should I do next? | [tasks.md](./tasks.md) |
| How do I set up locally? | [quickstart.md](./quickstart.md) |
| Why checkbox-based design? | [DESIGN_UPDATE.md](./DESIGN_UPDATE.md) |

---

## Document Stats

| Document | Lines | Purpose |
|----------|-------|---------|
| spec.md | ~120 | Feature specification |
| plan.md | ~143 | Implementation plan |
| data-model.md | ~686 | Entity schema & migrations |
| contracts/api.md | ~448 | API contracts |
| tasks.md | ~400 | Task breakdown (MAIN EXECUTION DOCUMENT) |
| quickstart.md | ~298 | Dev setup |
| DESIGN_UPDATE.md | ~200 | Design rationale |
| PHASE_2_COMPLETION.md | ~220 | Completion report |
| **Total** | **~2,515** | Complete feature documentation |

---

**Status**: Phase 2 Complete ✅  
**Next**: Begin Phase 3 Implementation  
**First Task**: [T001 - Create Flyway migration V3.0.0](./tasks.md#t001---create-flyway-migration-v300)

---

*Created by GitHub Copilot | speckit.tasks mode | 2025-12-14*
