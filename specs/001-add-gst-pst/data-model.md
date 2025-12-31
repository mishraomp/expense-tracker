# Data Model: Add GST and PST taxes to expenses and line items (Checkbox-based with Database Defaults)

**Date**: 2025-12-14  
**Status**: Design Phase 1  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Overview

This document defines the data model additions for GST and PST tax tracking using **checkbox-based applicability flags** with **system-wide default rates**. Users toggle "Apply GST" / "Apply PST" checkboxes; the backend applies configured default rates and calculates amounts automatically. No manual rate entry in Phase 1.

---

## Entity: TaxDefaults (New)

System-wide (or region/user-specific in Phase 2) tax rate defaults.

### Fields

| Field | Type | Nullable | Default | Validation | Notes |
|-------|------|----------|---------|-----------|-------|
| `id` | UUID | ❌ No | auto | Primary key | |
| `gst_rate` | decimal(5,2) | ❌ No | 5.00 | >= 0, <= 100 | Default GST rate (e.g., 5.00 = 5%). Initially 5% for Canada. |
| `pst_rate` | decimal(5,2) | ❌ No | 7.00 | >= 0, <= 100 | Default PST rate (e.g., 7.00 = 7%). Initially 7% for Canada (average). |
| `is_default` | boolean | ❌ No | true | - | Marks this as the system default. Only one row with `is_default=true`. |
| `region` | varchar(10) | ✅ Yes | null | - | Reserved for Phase 2 (e.g., "CA-ON", "CA-BC" for province-specific rates). |
| `user_id` | UUID | ✅ Yes | null | Foreign key to users | Reserved for Phase 2 (user-specific overrides). |
| `created_at` | timestamp | ❌ No | NOW() | - | Audit. |
| `updated_at` | timestamp | ❌ No | NOW() | - | Audit. |

### Constraints

- Unique constraint: only one row with `is_default=true` at any time.
- Foreign key to `users` (if user-specific, optional).

---

## Entity: Expense

### New Fields

| Field | Type | Nullable | Default | Validation | Notes |
|-------|------|----------|---------|-----------|-------|
| `gst_applicable` | boolean | ❌ No | false | - | Checkbox: apply system default GST rate? |
| `pst_applicable` | boolean | ❌ No | false | - | Checkbox: apply system default PST rate? |
| `gst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | **Computed from default rate** when `gst_applicable=true`. Read-only in API. |
| `pst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | **Computed from default rate** when `pst_applicable=true`. Read-only in API. |

### Computed Fields (Backend only)

```typescript
get gstRate(): number {
  // Returns the system default GST rate when gst_applicable is true
  return this.gst_applicable ? taxDefaults.gst_rate : 0;
}

get pstRate(): number {
  // Returns the system default PST rate when pst_applicable is true
  return this.pst_applicable ? taxDefaults.pst_rate : 0;
}

get total(): number {
  // subtotal + gst_amount + pst_amount, rounded to 2 decimals
  return round(this.subtotal + this.gst_amount + this.pst_amount, 2);
}

get totalTaxAmount(): number {
  // gst_amount + pst_amount
  return this.gst_amount + this.pst_amount;
}
```

### Relationships

- **ExpenseLines** (one-to-many): When lines present, expense `gst_amount` and `pst_amount` are **aggregates** (sum of all line tax amounts).
- **TaxDefaults** (many-to-one, implicit): Backend looks up system default rates when computing amounts.
- **User** (many-to-one): Unchanged.
- **Category** (many-to-one): Unchanged.

### Calculation Rules

1. **When no lines**: 
   ```
   gst_amount = gst_applicable ? subtotal * (taxDefaults.gst_rate / 100) : 0
   pst_amount = pst_applicable ? subtotal * (taxDefaults.pst_rate / 100) : 0
   ```

2. **When lines exist**: Expense taxes are **sum of line taxes**.
   ```
   expense.gst_amount = SUM(line.gst_amount for all lines)
   expense.pst_amount = SUM(line.pst_amount for all lines)
   ```

3. **Rounding**: Final `total` rounded to 2 decimals.
   ```
   total = round(subtotal + gst_amount + pst_amount, 2)
   ```

4. **False flags**: `gst_applicable=false` or `pst_applicable=false` → amount = 0 (tax-exempt).

---

## Entity: ExpenseLine

### New Fields

| Field | Type | Nullable | Default | Validation | Notes |
|-------|------|----------|---------|-----------|-------|
| `gst_applicable` | boolean | ❌ No | false | - | Checkbox: apply default GST rate? Overrides expense-level if true. |
| `pst_applicable` | boolean | ❌ No | false | - | Checkbox: apply default PST rate? Overrides expense-level if true. |
| `gst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | Computed from default rate and line subtotal when `gst_applicable=true`. |
| `pst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | Computed from default rate and line subtotal when `pst_applicable=true`. |

### Computed Fields (Backend only)

```typescript
get gstRate(): number {
  return this.gst_applicable ? taxDefaults.gst_rate : 0;
}

get pstRate(): number {
  return this.pst_applicable ? taxDefaults.pst_rate : 0;
}

get total(): number {
  // line_subtotal + gst_amount + pst_amount (NOT rounded at line level)
  return this.subtotal + this.gst_amount + this.pst_amount;
}
```

### Relationships

- **Expense** (many-to-one): Parent expense whose `gst_amount` and `pst_amount` are aggregates of all lines.

### Calculation Rules

1. **Tax per line** (exact, not rounded):
   ```
   gst_amount = gst_applicable ? subtotal * (taxDefaults.gst_rate / 100) : 0
   pst_amount = pst_applicable ? subtotal * (taxDefaults.pst_rate / 100) : 0
   ```

2. **Line overrides expense**: If line `gst_applicable=true`, use default GST rate regardless of expense-level setting.

3. **Line total** (before aggregation):
   ```
   line.total = subtotal + gst_amount + pst_amount
   ```

---

## Database Schema Changes

### Flyway Migration: V3.0.0__add_gst_pst_taxes.sql

```sql
-- Create TaxDefaults table
CREATE TABLE tax_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  pst_rate NUMERIC(5,2) NOT NULL DEFAULT 7.00,
  is_default BOOLEAN NOT NULL DEFAULT true,
  region VARCHAR(10) DEFAULT NULL,
  user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Constraint: only one row with is_default=true
ALTER TABLE tax_defaults
  ADD CONSTRAINT chk_one_default CHECK (
    (is_default = false) OR (is_default = true AND region IS NULL AND user_id IS NULL)
  );

-- Unique index on is_default
CREATE UNIQUE INDEX idx_tax_defaults_is_default ON tax_defaults(is_default) WHERE is_default = true;

-- Insert initial system defaults (GST 5%, PST 7% for Canada)
INSERT INTO tax_defaults (gst_rate, pst_rate, is_default)
  VALUES (5.00, 7.00, true);

-- Add boolean columns to expenses table
ALTER TABLE expenses
  ADD COLUMN gst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN pst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add constraints
ALTER TABLE expenses
  ADD CONSTRAINT chk_gst_amount CHECK (gst_amount >= -999999.99 AND gst_amount <= 999999.99),
  ADD CONSTRAINT chk_pst_amount CHECK (pst_amount >= -999999.99 AND pst_amount <= 999999.99);

-- Add indexes on flags for filtering
CREATE INDEX idx_expenses_gst_applicable ON expenses(gst_applicable);
CREATE INDEX idx_expenses_pst_applicable ON expenses(pst_applicable);

-- Add boolean columns to expense_items table
ALTER TABLE expense_items
  ADD COLUMN gst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN pst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add constraints
ALTER TABLE expense_items
  ADD CONSTRAINT chk_expense_items_gst_amount CHECK (gst_amount >= -999999.99 AND gst_amount <= 999999.99),
  ADD CONSTRAINT chk_expense_items_pst_amount CHECK (pst_amount >= -999999.99 AND pst_amount <= 999999.99);

-- Add indexes on flags for filtering
CREATE INDEX idx_expense_items_gst_applicable ON expense_items(gst_applicable);
CREATE INDEX idx_expense_items_pst_applicable ON expense_items(pst_applicable);
```

---

## Prisma Schema Updates

```prisma
model TaxDefaults {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  gstRate     Decimal   @default(5.00) @db.Numeric(5, 2)
  pstRate     Decimal   @default(7.00) @db.Numeric(5, 2)
  isDefault   Boolean   @default(true)
  region      String?
  userId      String?   @db.Uuid
  user        User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([isDefault], where: { isDefault: true })
  @@map("tax_defaults")
}

model Expense {
  // ... existing fields ...
  gstApplicable Boolean   @default(false) @map("gst_applicable")
  pstApplicable Boolean   @default(false) @map("pst_applicable")
  gstAmount     Decimal   @default(0) @db.Numeric(12, 2)
  pstAmount     Decimal   @default(0) @db.Numeric(12, 2)

  // Relationships
  expenseItems  ExpenseItem[]
  // ... other relationships ...
}

model ExpenseItem {
  // ... existing fields ...
  gstApplicable Boolean   @default(false) @map("gst_applicable")
  pstApplicable Boolean   @default(false) @map("pst_applicable")
  gstAmount     Decimal   @default(0) @db.Numeric(12, 2)
  pstAmount     Decimal   @default(0) @db.Numeric(12, 2)

  // Relationships
  expense       Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  expenseId     Int
  // ... other relationships ...
}

model User {
  // ... existing fields ...
  taxDefaults   TaxDefaults[]  // User-specific overrides (Phase 2)
  // ... other relationships ...
}
```

---

## API Response Examples

### Create Expense with Tax Checkboxes

**Request**:
```json
{
  "date": "2025-12-14",
  "description": "Office supplies",
  "amount": 100.00,
  "gstApplicable": true,
  "pstApplicable": true,
  "categoryId": 1
}
```

**Response** (201 Created, applies system defaults: GST 5%, PST 7%):
```json
{
  "id": 42,
  "date": "2025-12-14",
  "description": "Office supplies",
  "subtotal": 100.00,
  "gstApplicable": true,
  "pstApplicable": true,
  "gstRate": 5.00,
  "gstAmount": 5.00,
  "pstRate": 7.00,
  "pstAmount": 7.00,
  "total": 112.00,
  "categoryId": 1,
  "userId": "user-123",
  "createdAt": "2025-12-14T10:00:00Z"
}
```

### Create Expense without Taxes

**Request**:
```json
{
  "date": "2025-12-14",
  "description": "Personal meal",
  "amount": 25.00,
  "categoryId": 5
}
```

**Response** (no taxes: flags false, amounts 0):
```json
{
  "id": 43,
  "date": "2025-12-14",
  "description": "Personal meal",
  "subtotal": 25.00,
  "gstApplicable": false,
  "gstRate": null,
  "gstAmount": 0,
  "pstApplicable": false,
  "pstRate": null,
  "pstAmount": 0,
  "total": 25.00,
  "categoryId": 5,
  "userId": "user-123",
  "createdAt": "2025-12-14T10:35:00Z"
}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Both flags false** | `gst_amount` = 0, `pst_amount` = 0 (tax-exempt). |
| **Negative amount (refund)** | Tax amounts are negative (e.g., -$100 with GST flag true = -$5 GST). |
| **Expense with lines** | Expense `gst_amount` and `pst_amount` are **sum of line amounts**; expense-level flags used only when no lines. |
| **Line overrides expense** | If line `gst_applicable=true` and expense `gst_applicable=false`, line applies GST; expense flag ignored for that line. |
| **System default rate changes** | Existing expenses keep computed amounts (historical accuracy); new expenses use updated defaults. |
| **CSV import missing flags** | Flags default to false (tax-exempt). Amounts computed from flags. |

---

## Backward Compatibility

- **Existing expenses** (before migration): All new flags default to false (tax-exempt), amounts default to 0. No breaking changes.
- **CSV import**: Missing checkbox columns treated as false.
- **UI**: Opt-in feature; existing expense forms work unchanged until updated.

---

## Testing Strategy

- **Unit**: Checkbox-to-calculation mapping, default rate application, line aggregation, rounding.
- **Contract**: API endpoints (request/response schemas with boolean flags).
- **E2E**: Full CRUD flows (create, toggle checkboxes, verify automatic calculations, edit, delete).

See `spec.md` Success Criteria for detailed test coverage requirements.


---

## Entity: Expense

### New Fields

| Field | Type | Nullable | Default | Validation | Notes |
|-------|------|----------|---------|-----------|-------|
| `gst_rate` | decimal(5,2) | ✅ Yes | null | Optional; >= 0, <= 100 | GST rate as percentage (e.g., 5.00 = 5%). null = no GST or use global default. |
| `pst_rate` | decimal(5,2) | ✅ Yes | null | Optional; >= 0, <= 100 | PST rate as percentage (e.g., 7.00 = 7%). null = no PST or use global default. |
| `gst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | Calculated GST amount in expense currency. Always computed from `gst_rate` and `subtotal`. |
| `pst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | Calculated PST amount in expense currency. Always computed from `pst_rate` and `subtotal`. |

### Computed Fields (Backend only)

```typescript
get total(): number {
  // subtotal + gst_amount + pst_amount, rounded to 2 decimals
  return round(this.subtotal + this.gst_amount + this.pst_amount, 2);
}

get totalTaxAmount(): number {
  // gst_amount + pst_amount
  return this.gst_amount + this.pst_amount;
}
```

### Relationships

- **ExpenseLines** (one-to-many): When lines present, expense `gst_amount` and `pst_amount` are **aggregates** (sum of all line tax amounts), not independently set.
- **User** (many-to-one): Unchanged.
- **Category** (many-to-one): Unchanged.

### Calculation Rules

1. **When no lines**: Taxes computed from `gst_rate` and `pst_rate` applied to `subtotal` (exclusive mode).
   ```
   gst_amount = subtotal * (gst_rate / 100)
   pst_amount = subtotal * (pst_rate / 100)
   ```

2. **When lines exist**: Expense taxes are **sum of line taxes** (line-level rates take precedence).
   ```
   expense.gst_amount = SUM(line.gst_amount for all lines)
   expense.pst_amount = SUM(line.pst_amount for all lines)
   ```

3. **Rounding**: Final `total` rounded to 2 decimals.
   ```
   total = round(subtotal + gst_amount + pst_amount, 2)
   ```

4. **Null rates**: Treated as 0% (no tax). May fall back to global defaults if configured.

---

## Entity: ExpenseLine

### New Fields

| Field | Type | Nullable | Default | Validation | Notes |
|-------|------|----------|---------|-----------|-------|
| `gst_rate` | decimal(5,2) | ✅ Yes | null | Optional; >= 0, <= 100 | GST rate for this line. Overrides expense-level `gst_rate`. null = inherit expense rate or use global default. |
| `pst_rate` | decimal(5,2) | ✅ Yes | null | Optional; >= 0, <= 100 | PST rate for this line. Overrides expense-level `pst_rate`. null = inherit expense rate or use global default. |
| `gst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | Calculated GST amount for this line. Computed from `gst_rate` and line `subtotal` (or `amount`). |
| `pst_amount` | decimal(12,2) | ❌ No | 0 | >= -999999.99, <= 999999.99 | Calculated PST amount for this line. Computed from `pst_rate` and line `subtotal` (or `amount`). |

### Computed Fields (Backend only)

```typescript
get total(): number {
  // line_subtotal + gst_amount + pst_amount (NOT rounded at line level)
  return this.subtotal + this.gst_amount + this.pst_amount;
}
```

### Relationships

- **Expense** (many-to-one): Parent expense whose `gst_amount` and `pst_amount` are aggregates of all lines.

### Calculation Rules

1. **Tax per line** (exact, not rounded):
   ```
   gst_amount = subtotal * (gst_rate / 100)  [if gst_rate not null; else 0]
   pst_amount = subtotal * (pst_rate / 100)  [if pst_rate not null; else 0]
   ```

2. **Inheritance**: If line `gst_rate` is null, may inherit from expense `gst_rate` or global default.

3. **Line total** (before aggregation):
   ```
   line.total = subtotal + gst_amount + pst_amount
   ```

---

## Global Configuration (Optional, Phase 2)

### TaxDefaults Entity (Future)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User (or global if admin-only). |
| `region` | varchar | Optional: e.g., "CA", "CA-ON", "CA-BC" for regional PST differences. |
| `gst_rate` | decimal(5,2) | Default GST rate (e.g., 5.00 for 5%). |
| `pst_rate` | decimal(5,2) | Default PST rate (e.g., 7.00 for 7%). |
| `created_at` | timestamp | Audit. |
| `updated_at` | timestamp | Audit. |

**Note**: This entity is **out of scope** for Phase 1; captured for potential Phase 2 feature.

---

## Validation Rules

### Rate Validation (Class-Validator DTOs)

```typescript
@IsOptional()
@IsDecimal({ decimal_digits: '1,2', force_decimal: true })
@Min(0)
@Max(100)
@IsNull()
gst_rate?: decimal;

@IsOptional()
@IsDecimal({ decimal_digits: '1,2', force_decimal: true })
@Min(0)
@Max(100)
@IsNull()
pst_rate?: decimal;
```

### Amount Validation

- `gst_amount` and `pst_amount` are **read-only** in DTOs; computed by service on persist.
- Computed amounts must fall within ±999999.99 (database column constraint).

### Negative Amounts (Refunds)

- Negative `subtotal` values (refunds/credits) are valid; resulting negative tax amounts are valid.
- Example: Refund of $100 with GST 5% → `gst_amount = -5.00`.

---

## Database Schema Changes

### Flyway Migration: V3.0.0__add_gst_pst_taxes.sql

```sql
-- Add GST/PST columns to expenses table
ALTER TABLE expenses
  ADD COLUMN gst_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN pst_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN pst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add constraints
ALTER TABLE expenses
  ADD CONSTRAINT chk_gst_rate CHECK (gst_rate IS NULL OR (gst_rate >= 0 AND gst_rate <= 100)),
  ADD CONSTRAINT chk_pst_rate CHECK (pst_rate IS NULL OR (pst_rate >= 0 AND pst_rate <= 100)),
  ADD CONSTRAINT chk_gst_amount CHECK (gst_amount >= -999999.99 AND gst_amount <= 999999.99),
  ADD CONSTRAINT chk_pst_amount CHECK (pst_amount >= -999999.99 AND pst_amount <= 999999.99);

-- Add index on gst/pst rates for filtering
CREATE INDEX idx_expenses_gst_rate ON expenses(gst_rate);
CREATE INDEX idx_expenses_pst_rate ON expenses(pst_rate);

-- Add GST/PST columns to expense_items table
ALTER TABLE expense_items
  ADD COLUMN gst_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN pst_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN pst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add constraints
ALTER TABLE expense_items
  ADD CONSTRAINT chk_expense_items_gst_rate CHECK (gst_rate IS NULL OR (gst_rate >= 0 AND gst_rate <= 100)),
  ADD CONSTRAINT chk_expense_items_pst_rate CHECK (pst_rate IS NULL OR (pst_rate >= 0 AND pst_rate <= 100)),
  ADD CONSTRAINT chk_expense_items_gst_amount CHECK (gst_amount >= -999999.99 AND gst_amount <= 999999.99),
  ADD CONSTRAINT chk_expense_items_pst_amount CHECK (pst_amount >= -999999.99 AND pst_amount <= 999999.99);

-- Add index on gst/pst rates for filtering
CREATE INDEX idx_expense_items_gst_rate ON expense_items(gst_rate);
CREATE INDEX idx_expense_items_pst_rate ON expense_items(pst_rate);
```

---

## Prisma Schema Updates

```prisma
model Expense {
  // ... existing fields ...
  gstRate       Decimal?  @db.Numeric(5, 2)
  pstRate       Decimal?  @db.Numeric(5, 2)
  gstAmount     Decimal   @default(0) @db.Numeric(12, 2)
  pstAmount     Decimal   @default(0) @db.Numeric(12, 2)

  // Relationships
  expenseItems  ExpenseItem[]
  // ... other relationships ...
}

model ExpenseItem {
  // ... existing fields ...
  gstRate       Decimal?  @db.Numeric(5, 2)
  pstRate       Decimal?  @db.Numeric(5, 2)
  gstAmount     Decimal   @default(0) @db.Numeric(12, 2)
  pstAmount     Decimal   @default(0) @db.Numeric(12, 2)

  // Relationships
  expense       Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  expenseId     Int
  // ... other relationships ...
}
```

---

## API Response Examples

### Create Expense with Taxes

**Request**:
```json
{
  "date": "2025-12-14",
  "description": "Office supplies",
  "amount": 100.00,
  "gstRate": 5.00,
  "pstRate": 7.00,
  "categoryId": 1
}
```

**Response** (201 Created):
```json
{
  "id": 42,
  "date": "2025-12-14",
  "description": "Office supplies",
  "subtotal": 100.00,
  "gstRate": 5.00,
  "pstRate": 7.00,
  "gstAmount": 5.00,
  "pstAmount": 7.00,
  "total": 112.00,
  "categoryId": 1,
  "userId": "user-123",
  "createdAt": "2025-12-14T10:00:00Z"
}
```

### Create Expense without Taxes

**Request**:
```json
{
  "date": "2025-12-14",
  "description": "Personal meal",
  "amount": 25.00,
  "categoryId": 5
}
```

**Response** (201 Created):
```json
{
  "id": 43,
  "date": "2025-12-14",
  "description": "Personal meal",
  "subtotal": 25.00,
  "gstRate": null,
  "pstRate": null,
  "gstAmount": 0,
  "pstAmount": 0,
  "total": 25.00,
  "categoryId": 5,
  "userId": "user-123",
  "createdAt": "2025-12-14T10:00:00Z"
}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Null tax rate** | Treated as 0%; `gst_amount` = 0, `pst_amount` = 0. |
| **Negative amount (refund)** | Tax amounts are negative (e.g., -$100 with 5% GST = -$5 GST). |
| **Expense with lines** | Expense `gst_amount` and `pst_amount` are **sum of line amounts**; expense-level rates ignored. |
| **Line with null rate, expense with rate** | Line inherits expense rate (implementation detail in service). |
| **Rounding** | Per-line taxes exact; expense-level total rounded to 2 decimals. |
| **CSV import missing tax columns** | Tax fields default to null (tax-exempt). Optional warning/report. |

---

## Backward Compatibility

- **Existing expenses** (before migration): All new tax fields default to null/0 (tax-exempt).
- **No breaking changes**: DTOs accept optional tax fields; omitting them is valid.
- **CSV import**: Handles missing tax columns gracefully (treats as 0).

---

## Testing Strategy

- **Unit**: Calculation logic (tax amounts, aggregation, rounding).
- **Contract**: API endpoints (request/response schemas with taxes).
- **E2E**: Full CRUD flows (create, edit, list, delete expenses with taxes).

See `spec.md` Success Criteria for detailed test coverage requirements.
