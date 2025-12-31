# Phase 2 Implementation Complete: Tax Calculation Service

## Overview
Implemented the core backend tax calculation logic with a modular, testable design following NestJS patterns.

## Files Created

### Tax Module Structure
```
backend/src/modules/taxes/
├── taxes.module.ts                  # Module definition
├── tax-calculation.service.ts       # Core calculation logic
└── dto/
    ├── tax-calculation.dto.ts       # Tax calculation DTOs
    └── tax-defaults-response.dto.ts # Tax defaults response DTO

backend/tests/unit/taxes/
└── tax-calculation.service.spec.ts  # Comprehensive unit tests
```

## Implementation Details

### TaxCalculationService (`tax-calculation.service.ts`)
**Core Methods:**

1. **`getSystemDefaults()`**
   - Retrieves system-wide default tax rates (GST 5%, PST 7%)
   - Falls back to hardcoded defaults if database row not found
   - Ensures every operation has valid tax rates

2. **`getTaxRatesForUser(userId)`**
   - Gets user-specific tax rates (Phase 2 extensibility)
   - Priority: user-specific rates > system default
   - Ready for regional/user overrides in future phases

3. **`calculateLineTaxes(amount, gstApplicable, pstApplicable, taxRates)`**
   - **Exclusive tax mode**: Taxes apply to the subtotal only, not to each other
   - **Per-total rounding**: Each tax calculated independently with 2 decimal places
   - Returns: `TaxCalculationDto` with both applicability flags and amounts
   - Example: $100 → GST $5.00, PST $7.00 (not cumulative)

4. **`calculateExpenseTaxes(expenseId, items, taxRates)`**
   - Aggregates line-item taxes to expense level
   - Returns: `ExpenseTaxSummaryDto` with:
     - Subtotal (sum of all line amounts)
     - Total GST and PST
     - Individual item tax calculations (for UI display)
   - Handles multiple line items efficiently

5. **`applyTaxesToExpense(expenseId, expenseTaxSummary)`**
   - Persists calculated taxes to database
   - Updates `expenses` table with totals (gst_amount, pst_amount)
   - Updates all `expense_items` with per-item taxes
   - Transactional: all-or-nothing update

6. **Validation Methods**
   - `validateTaxFlags()` - Ensures boolean applicability flags
   - `validateAmount()` - Ensures positive amounts

### DTOs

**`TaxDefaultsResponseDto`**
```typescript
{
  id: string;
  gstRate: Decimal;      // From database: numeric(5,2)
  pstRate: Decimal;
  isDefault: boolean;    // true for system default
  region?: string;       // null for system default, "ON"/"BC" for regional
  userId?: string;       // null for system default, UUID for user-specific
  createdAt: Date;
  updatedAt: Date;
}
```

**`TaxCalculationDto`** (single line item)
```typescript
{
  gstApplicable: boolean;    // User's checkbox selection
  pstApplicable: boolean;
  gstAmount: Decimal;        // Calculated: amount * gstRate / 100
  pstAmount: Decimal;
  totalTaxAmount: Decimal;   // gstAmount + pstAmount
  lineSubtotal: Decimal;     // Original amount before taxes
}
```

**`ExpenseTaxSummaryDto`** (full expense)
```typescript
{
  expenseId: string;
  subtotal: Decimal;                     // Sum of all line amounts
  gstAmount: Decimal;                    // Sum of all line GSTs
  pstAmount: Decimal;                    // Sum of all line PSTs
  totalTaxAmount: Decimal;               // gstAmount + pstAmount
  totalWithTax: Decimal;                 // subtotal + totalTaxAmount
  itemTaxes: Map<itemId, TaxCalculationDto>;  // Per-item breakdown
}
```

### Module Integration

**`taxes.module.ts`**
```typescript
@Module({
  imports: [PrismaModule],
  providers: [TaxCalculationService],
  exports: [TaxCalculationService],  // Available to other modules
})
export class TaxesModule {}
```

Ready to import into `ExpensesModule` for expense creation/update flow.

## Unit Tests (`tax-calculation.service.spec.ts`)

**Coverage:**

1. **Line-item calculation tests**
   - Both taxes applicable: $100 → GST $5.00, PST $7.00, Total $12.00
   - Only GST: $100 → GST $5.00, PST $0
   - Only PST: $100 → GST $0, PST $7.00
   - Neither: $100 → GST $0, PST $0
   - Decimal rounding: $33.33 → GST $1.67, PST $2.33
   - Input flexibility: accepts number or Decimal

2. **Expense aggregation tests**
   - Multiple items with mixed applicability
   - Correct summation across all items
   - Individual item storage in Map
   - Empty items array handling
   - Generated item IDs when not provided

3. **System defaults tests**
   - Loads from database when available
   - Fallback to hardcoded (GST 5%, PST 7%)

4. **Validation tests**
   - Boolean flags validation
   - Positive amount validation
   - Rejects zero and negative amounts

## Design Decisions

### 1. Checkbox-Based Applicability
- **Why**: Simpler UX than manual rate entry
- **Implementation**: `gstApplicable` and `pstApplicable` booleans
- **Flexibility**: Can be set per-item for split receipts

### 2. Exclusive Tax Mode
- **Why**: Standard for Canadian taxes (GST/PST don't compound)
- **Implementation**: Each tax calculated from subtotal only
- **Formula**: `tax_amount = subtotal × (tax_rate / 100)`

### 3. Per-Total Rounding
- **Why**: Avoids rounding errors that compound across items
- **Implementation**: Each tax rounded independently to 2 decimals
- **Example**: 3 items of $33.33 each
  - Line 1: GST = $1.67, PST = $2.33
  - Line 2: GST = $1.67, PST = $2.33
  - Line 3: GST = $1.67, PST = $2.33
  - Total: GST = $5.01, PST = $7.00 (correct, not $5.00 / $7.00)

### 4. Database as Single Source of Truth
- **Why**: Consistency with Prisma schema approach
- **Implementation**: Service reads from `tax_defaults` table
- **Future**: Easy to extend with regional rates (Phase 2+)

### 5. Service Separation
- **Why**: Single Responsibility Principle
- **Implementation**: Taxes module separate from expenses
- **Integration**: ExpensesService calls TaxCalculationService

## Next Phase (Phase 3)

### Integration with Expenses API
1. Update `ExpensesService.create()` to:
   - Accept `gstApplicable`, `pstApplicable` flags from request
   - Call `TaxCalculationService.calculateExpenseTaxes()`
   - Call `TaxCalculationService.applyTaxesToExpense()` to persist

2. Update `ExpensesController` to expose tax fields in DTOs
   - Request: `CreateExpenseDto` with `gstApplicable`, `pstApplicable`
   - Response: `ExpenseResponseDto` with `gstAmount`, `pstAmount`

3. Frontend integration:
   - Tax checkbox component in expense form
   - Tax breakdown display in summary

## Database State
- ✅ `tax_defaults` table created with system defaults
- ✅ `expenses` table extended with tax columns
- ✅ `expense_items` table extended with tax columns
- ✅ Indexes created for tax filtering queries

## Status
- ✅ Phase 1: Database setup (migration + schema generation)
- ✅ Phase 2: Calculation service (TaxCalculationService + DTOs)
- ⏳ Phase 3: API integration (expenses endpoints + frontend)
