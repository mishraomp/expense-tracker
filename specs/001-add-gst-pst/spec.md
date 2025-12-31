# Feature Specification: Add GST and PST taxes to expenses and line items

**Feature Branch**: `001-add-gst-pst`  
**Created**: 2025-12-14  
**Status**: Draft  
**Input**: User description: "Add GST and PST tax fields and calculations to both main expense records and expense line items, include DB migrations, services and tests"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add taxes when creating or editing an expense (Priority: P1)

As a user creating or editing an expense, I can optionally add GST and PST values (rates or amounts) at the expense level so the system persists tax amounts and shows correct totals. If omitted, the expense is treated as tax-exempt.

**Why this priority**: Core accounting correctness — users must see accurate totals and tax breakdowns for expenses.

**Independent Test**: Create an expense with a base amount and explicit GST and PST rates; verify persisted `gst_amount`, `pst_amount`, and `total` are correct via API and UI.

**Acceptance Scenarios**:

1. **Given** an unsaved expense with a `subtotal` of 100.00 and GST=5% and PST=7%, **When** the user saves the expense, **Then** the backend stores `gst_amount=5.00`, `pst_amount=7.00`, and `total=112.00`.
2. **Given** an unsaved expense with a `subtotal` of 100.00 and no GST/PST provided (optional fields omitted), **When** the user saves the expense, **Then** the backend stores `gst_rate=null`, `pst_rate=null`, `gst_amount=0`, `pst_amount=0`, and `total=100.00`.
3. **Given** an existing expense with taxes configured, **When** the user updates the subtotal, **Then** the system recalculates and persists new tax amounts and total.

---

### User Story 2 - Add taxes at line-item level (Priority: P2)

As a user adding multiple line items to an expense, I can optionally set GST and PST per line so tax is calculated accurately per item and rolled up to the expense totals. Lines without tax rates are treated as tax-exempt.

**Why this priority**: Many expenses contain heterogeneous items (different tax applicability or rates); correct per-line tax ensures accurate financial records.

**Independent Test**: Add two line items with different tax rates, save, and verify each line stores `gst_amount`, `pst_amount`, and the expense `gst_amount` and `pst_amount` are the sum of line-level taxes.

**Acceptance Scenarios**:

1. **Given** an expense with two line items (line A subtotal 50.00, GST 5%; line B subtotal 50.00, GST 0%), **When** saving, **Then** line A `gst_amount=2.50`, line B `gst_amount=0.00`, and expense `gst_amount=2.50`.
2. **Given** an expense with two line items (line A subtotal 50.00, no tax; line B subtotal 50.00, GST 5%), **When** saving, **Then** line A `gst_rate=null, gst_amount=0`, line B `gst_rate=5%, gst_amount=2.50`, and expense `gst_amount=2.50`.

---

### User Story 3 - Reporting, export and import support for tax fields (Priority: P3)

As a user, when I view expense lists, export CSVs, or run reports, I can see GST/PST breakdowns (when taxes are set) and totals so records remain auditable and exports contain tax columns. Expenses without tax fields set show as tax-exempt.

**Why this priority**: Ensures downstream consumers (reports, exports, accounting) have accurate tax data.

**Independent Test**: Export an expense with taxes to CSV and verify `gst_rate`, `gst_amount`, `pst_rate`, `pst_amount` columns are present and values match persisted data.

**Acceptance Scenarios**:

1. **Given** an expense with taxes, **When** user requests CSV export, **Then** each exported row includes tax columns and values match stored fields.

---

### Edge Cases

- Expenses or lines with zero or null tax rates (treated as tax-exempt).
- Negative amounts or refunds (tax amounts should be negative and totals consistent).
- Importing older CSVs without tax columns — import should set tax fields to 0 and optionally report missing columns.
- Concurrent updates to line items — ensure totals and tax rollups are computed transactionally.
- Rounding differences (per-line vs per-expense) — see [NEEDS CLARIFICATION: rounding strategy].
- Regional tax applicability (e.g., PST not applicable in some provinces) — treat as rate=0 unless configured per expense or line.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store default GST and PST rates in `TaxDefaults` table (system-wide defaults, with optional region/user overrides in Phase 2).
- **FR-002**: System MUST add boolean `gst_applicable` and `pst_applicable` columns to `Expense` and `ExpenseLine` tables (instead of explicit rate fields).
- **FR-003**: When `gst_applicable=true`, backend applies default GST rate and calculates `gst_amount = subtotal * (default_rate / 100)`. Same for PST. When false, amounts are 0 (tax-exempt).
- **FR-004**: The backend MUST roll up line-level `gst_amount` and `pst_amount` into expense-level `gst_amount` and `pst_amount` when lines are present. If no lines, expense-level taxes computed from applicable flags and defaults.
- **FR-005**: The API DTOs for create/update expense and expense-line MUST accept `gst_applicable` and `pst_applicable` booleans (instead of rate fields) and return computed `gst_amount`, `pst_amount`, and total with the default rates applied.
- **FR-006**: The UI MUST provide checkboxes for "Apply GST" and "Apply PST" at expense-level and per-line, showing calculated amounts and totals automatically based on defaults.
- **FR-007**: CSV import/export MUST preserve `gst_applicable` and `pst_applicable` flags and computed `gst_amount`, `pst_amount` columns.
- **FR-008**: Add database migrations and tests (unit, contract, and UI) to cover checkbox toggles, default rate application, tax calculations, and edge cases.

*Clarifications resolved in design:*

- **Design-001**: Tax rates source: System-wide defaults in `TaxDefaults` table (no per-record rates). Users toggle applicability via checkboxes.
- **Design-002**: Rounding strategy: Per-total (compute exact per-line taxes, sum, round final expense total to 2 decimals).
- **Design-003**: Manual rate override: Not in scope for Phase 1. Phase 2 feature for region/user-specific rate overrides.

### Key Entities *(include if feature involves data)*

- **Expense**: add `gst_applicable: boolean = false`, `pst_applicable: boolean = false` (flags to apply defaults), `gst_amount: decimal = 0`, `pst_amount: decimal = 0` (computed from defaults and flags).
- **ExpenseLine**: add `gst_applicable: boolean = false`, `pst_applicable: boolean = false` (flags override expense level), `gst_amount: decimal = 0`, `pst_amount: decimal = 0` (computed).
- **TaxDefaults** (new entity): `id: UUID`, `gst_rate: decimal(5,2)`, `pst_rate: decimal(5,2)`, `is_default: boolean` (marks system defaults), created_at, updated_at. Region/user columns reserved for Phase 2.
- **Import/Export row**: CSV columns `gst_applicable` (boolean), `gst_amount` (computed), `pst_applicable`, `pst_amount`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of API create/update calls including tax fields persist `gst_amount` and `pst_amount` and the returned `total` matches the expected arithmetic (within rounding rules).
- **SC-002**: Unit tests cover the tax calculation matrix (multiple rates and line combinations) and pass at >= 95% coverage for tax logic.
- **SC-003**: UI shows tax breakdown and totals in create/edit flows for 100% of expenses with tax fields set (manual verification / automated UI tests).
- **SC-004**: CSV import/export round-trips preserve tax columns for 100% of tested export/import cases.

### Assumptions

- Tax rates are stored globally in `TaxDefaults` table; users cannot manually override rates (Phase 1 scope). System applies defaults when `gst_applicable` or `pst_applicable` flags are true.
- Checkboxes are the UX: users toggle "Apply GST" / "Apply PST" (boolean); rates and calculations happen automatically on backend.
- Default rates are system-wide initially; region/user-specific overrides deferred to Phase 2.
- When tax-applicable flag is false, amounts default to 0 (tax-exempt).
- When a line-level flag is present, it takes precedence over expense-level flag for that line.
- Rounding: All per-line taxes computed exactly; final expense-level totals rounded to 2 decimals.
- System will not attempt to infer regional PST rules automatically unless later configured.

### Out of Scope

- Building a regional tax engine or automatic province-to-PST mapping.
- UI for global tax configuration (may be added in a follow-up feature).

---

**Next Steps**: Present the three clarification questions (tax mode, tax-rate source, rounding) for product decision. After decisions, implement DB migrations, update DTOs, add backend/services logic, update frontend forms and list views, add import/export columns, and add tests.
