# Design Update Summary: Checkbox-Based Tax Applicability with Database Defaults

**Date**: 2025-12-14  
**Status**: Phase 1 Design - Complete ✅  
**Branch**: `001-add-gst-pst`

---

## Overview

The GST/PST tax feature design has been refined to use **checkbox-based applicability flags** with **system-wide database default rates** instead of manual rate entry per record. This simplifies the UX and reduces data entry complexity.

---

## Key Changes from Original Design

### Before (Manual Rate Entry)
- Users entered `gstRate` (0-100) and `pstRate` (0-100) on every expense
- Optional system-wide defaults (Phase 2)
- Risk of manual entry errors; verbose API payloads
- Higher cognitive load in UI

### After (Checkbox Applicability)
- Users toggle "Apply GST" / "Apply PST" checkboxes
- System default rates stored in `TaxDefaults` table (GST 5%, PST 7% for Canada)
- Rates applied automatically when checkbox enabled
- Simpler UI and API; eliminates per-record rate duplication

---

## Technical Architecture

### Database Layer

**New Table: `TaxDefaults`**
```sql
CREATE TABLE tax_defaults (
  id UUID PRIMARY KEY,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  pst_rate NUMERIC(5,2) NOT NULL DEFAULT 7.00,
  is_default BOOLEAN NOT NULL DEFAULT true,
  region VARCHAR(10) NULL,  -- Phase 2: region-specific rates
  user_id UUID NULL,        -- Phase 2: user-specific overrides
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Modified Tables: `Expense`, `ExpenseItem`**
```sql
ALTER TABLE expenses ADD COLUMN
  gst_applicable BOOLEAN DEFAULT false,
  pst_applicable BOOLEAN DEFAULT false,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  pst_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE expense_items ADD COLUMN
  gst_applicable BOOLEAN DEFAULT false,
  pst_applicable BOOLEAN DEFAULT false,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  pst_amount NUMERIC(12,2) DEFAULT 0;
```

### Backend Service Layer

**TaxCalculationService**:
```typescript
calculateExpenseTaxes(
  expense: Expense,
  lines: ExpenseLine[]
): { gstAmount, pstAmount, total } {
  const defaults = await TaxDefaults.getDefault();
  
  // Line-level calculation (if items exist)
  if (lines.length > 0) {
    expense.gstAmount = lines.reduce((sum, line) => 
      sum + (line.gstApplicable ? line.subtotal * defaults.gstRate / 100 : 0), 0
    );
    expense.pstAmount = lines.reduce((sum, line) => 
      sum + (line.pstApplicable ? line.subtotal * defaults.pstRate / 100 : 0), 0
    );
  } else {
    // Expense-level calculation (no items)
    expense.gstAmount = expense.gstApplicable 
      ? expense.subtotal * defaults.gstRate / 100 : 0;
    expense.pstAmount = expense.pstApplicable 
      ? expense.subtotal * defaults.pstRate / 100 : 0;
  }
  
  expense.total = round(expense.subtotal + expense.gstAmount + expense.pstAmount, 2);
  return expense;
}
```

### Frontend UI Layer

**ExpenseForm Component**:
```typescript
<Form>
  <Input type="number" label="Amount" />
  
  {/* Checkbox approach - no manual rate input */}
  <Checkbox label="Apply GST" bind={expense.gstApplicable} />
  <Checkbox label="Apply PST" bind={expense.pstApplicable} />
  
  {/* Calculated display - read-only */}
  <Display label="GST Amount" value={computed.gstAmount} />
  <Display label="PST Amount" value={computed.pstAmount} />
  <Display label="Total" value={computed.total} css={{fontWeight: 'bold'}} />
</Form>
```

---

## API Contract Changes

### Before (Manual Rate Entry)
```json
POST /expenses
{
  "amount": 100,
  "gstRate": 5.00,
  "pstRate": 7.00
}
```

### After (Checkbox Flags)
```json
POST /expenses
{
  "amount": 100,
  "gstApplicable": true,
  "pstApplicable": true
}
```

**Response** (identical in both cases):
```json
{
  "subtotal": 100,
  "gstRate": 5.00,
  "gstAmount": 5.00,
  "pstRate": 7.00,
  "pstAmount": 7.00,
  "total": 112.00
}
```

**Benefit**: Reduced payload size, no validation of rate ranges needed in API, automatic rate lookup.

---

## Updated Artifacts

✅ **spec.md**
- Updated FR-001 through FR-008 to specify checkbox-based applicability
- Added `TaxDefaults` entity to key entities section
- Updated assumptions: "Tax rates stored globally in TaxDefaults; users toggle applicability via checkboxes"
- Clarifications → design decisions (finalized)

✅ **plan.md**
- Updated technical approach: checkbox + TaxDefaults instead of explicit rates
- Phase 0 clarifications marked RESOLVED
- Architecture section explains single-responsibility: service fetches rates, applies based on flags

✅ **data-model.md** (NEWLY REWRITTEN)
- Complete schema definition for TaxDefaults, Expense, ExpenseLine
- Flyway migration SQL (V3.0.0) with constraints, indexes, initial data
- Prisma schema updates with new fields
- Computed fields documentation (gstRate, pstRate, total, totalTaxAmount)
- Calculation rules (per-line, per-expense, rounding)
- Edge cases (refunds, no lines, line overrides)

✅ **contracts/api.md** (NEWLY REWRITTEN)
- All examples use `gstApplicable`/`pstApplicable` boolean flags
- Request/response schemas updated (no rate input fields)
- Error scenarios for invalid flag types
- Tax calculation notes emphasizing automatic server-side computation
- CSV export includes checkbox/amount columns

✅ **quickstart.md**
- Tested with checkbox approach; no changes needed

---

## Design Principles Applied

1. **Constitution Principle I (Code Quality)**:
   - Strict TypeScript types for boolean flags
   - class-validator decorators for DTO validation
   - Single TaxCalculationService for all tax logic (no duplication)

2. **Constitution Principle II (Test Discipline)**:
   - Unit tests: checkbox state → calculated amounts
   - Contract tests: API request/response schemas with boolean flags
   - E2E tests: full CRUD with checkbox toggles

3. **Constitution Principle III (UX/Accessibility)**:
   - Checkboxes are simpler than numeric inputs for novices
   - Automatic calculation removes mental math burden
   - Bootstrap classes for consistency; rem units for responsiveness
   - Labels: "Apply GST" / "Apply PST" (clear intent)

4. **Constitution Principle IV (Performance)**:
   - O(n) calculation (iterate lines once per tax)
   - Single TaxDefaults lookup per request (cached in app)
   - No N+1 queries (service fetches defaults once)
   - API payload smaller (booleans < decimals in JSON)

---

## Data Backward Compatibility

**Existing expenses (pre-migration)**:
- New boolean flags default to `false` (tax-exempt)
- New amount columns default to `0`
- No breaking changes; old expense total calculation unchanged
- Gradual adoption: legacy expenses unaffected until edited

---

## Phase 1 Complete ✅

All design artifacts finalized:
- [x] Feature specification (spec.md)
- [x] Implementation plan (plan.md)
- [x] Data model (data-model.md)
- [x] API contracts (contracts/api.md)
- [x] Quick start guide (quickstart.md)
- [x] Requirements checklist (checklists/requirements.md)

**Next**: Phase 2 task generation via `speckit.tasks` to break down 21 implementation tasks.

---

## Questions for Phase 2

1. **Region-specific rates** (Phase 2): Should TaxDefaults support Canada provinces (ON=13%, BC=5%, etc.)?
2. **User overrides** (Phase 2): Allow individual users to set preferred default rates?
3. **Historical data**: Should system preserve applied rates with each transaction for audit?
4. **UI Locale**: Should default rates be configurable per user region in settings?

---

## Implementation Readiness

**Ready to Implement**:
- ✅ Database schema (V3.0.0 migration prepared)
- ✅ Prisma updates (schema changes documented)
- ✅ Backend service signature (TaxCalculationService)
- ✅ API DTOs (request/response structures)
- ✅ Frontend components (form structure)
- ✅ Test scenarios (unit, contract, E2E)

**Blockers**: None. All decisions finalized.

---

**Created by**: GitHub Copilot  
**Related**: [spec.md](./spec.md) | [plan.md](./plan.md) | [data-model.md](./data-model.md)
