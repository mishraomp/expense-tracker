# Quick Start: Testing the GST and PST Tax Feature

**Date**: 2025-12-14  
**Status**: Design Phase 1  
**Target**: Local development setup for testing the tax feature

---

## Prerequisites

- Node.js 18+ 
- npm 9+
- PostgreSQL 14+ running (via `./manage-services.ps1 start`)
- Docker (optional, for PostgreSQL if not running locally)
- VS Code with ESLint + Prettier extensions

---

## Setup

### 1. Start Services

```bash
cd C:\projects\personal\expense-tracker
./manage-services.ps1 start
# Waits for PostgreSQL and Keycloak to be ready
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run database migration (applies V3.0.0__add_gst_pst_taxes.sql)
npx prisma migrate dev --name add_gst_pst_taxes

# Generate Prisma client with new tax fields
npx prisma generate

# Start dev server
npm run start:dev
# Server runs on http://localhost:3000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens http://localhost:5173
```

---

## Testing the Feature Locally

### Manual Testing (Browser)

#### 1. Create an Expense with Taxes

1. Log in via Keycloak (http://localhost:5173)
2. Navigate to **Expenses** → **Add Expense**
3. Fill in:
   - Date: Today
   - Description: "Test expense with GST/PST"
   - Amount: 100.00
   - Category: Select any (e.g., "Office")
   - **GST Rate**: 5.00
   - **PST Rate**: 7.00
4. Click **Save**
5. Verify:
   - ✅ Expense saved
   - ✅ Total shows as 112.00 (100 + 5 + 7)
   - ✅ Tax breakdown visible (GST: 5.00, PST: 7.00)

#### 2. Create an Expense without Taxes (Tax-Exempt)

1. Navigate to **Expenses** → **Add Expense**
2. Fill in:
   - Date: Today
   - Description: "Tax-exempt meal"
   - Amount: 25.00
   - Category: "Meals"
   - **GST Rate**: Leave blank (null)
   - **PST Rate**: Leave blank (null)
3. Click **Save**
4. Verify:
   - ✅ Expense saved with total = 25.00 (no tax)

#### 3. Update Expense with Different Tax Rate

1. Open a saved expense with taxes
2. Edit GST rate to 0%, keep PST at 7%
3. Click **Save**
4. Verify:
   - ✅ Total recalculated (e.g., 100 + 0 + 7 = 107.00)
   - ✅ Breakdown updated

#### 4. Test Line Items with Taxes

*(Feature: add line items to expense)*

1. Create expense, then add line items:
   - Line 1: "Notebooks" $30, GST 5%, PST 7% → Total $33.60
   - Line 2: "Pens" $20, GST 5%, PST 0% → Total $21.00
2. Verify:
   - ✅ Each line shows calculated tax and total
   - ✅ Expense-level tax = sum of line taxes (5+7+5 = GST 1.50+2.10+1.00, PST 2.10)

---

### Automated Testing

#### Backend Unit Tests

```bash
cd backend

# Run all tests
npm test

# Run only tax calculation tests
npm test -- expenses/tax-calculation

# Run with coverage
npm run test:cov
```

**Test files to verify**:
- `backend/tests/unit/expenses/tax-calculation.spec.ts` (calculation logic)
- `backend/tests/contract/expenses.tax.spec.ts` (API endpoints)

#### Frontend Unit Tests

```bash
cd frontend

# Run all tests
npm test

# Run only expense form tests
npm test -- ExpenseForm

# Run with coverage
npm run test:cov
```

**Test files to verify**:
- `frontend/tests/unit/features/expenses/ExpenseForm.spec.tsx` (form inputs)

#### E2E Tests (Playwright)

```bash
cd frontend

# Run E2E tests (opens browser)
npm run e2e

# Run headless (CI mode)
npm run e2e:run

# Run specific test file
npm run e2e:run -- expenses.tax.spec.ts
```

**E2E test file**:
- `frontend/e2e/tests/expenses.tax.spec.ts` (full CRUD flows with taxes)

---

## API Testing (Postman / curl)

### Create Expense with Taxes

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "date": "2025-12-14",
    "description": "Office supplies",
    "amount": 100.00,
    "categoryId": 1,
    "gstRate": 5.00,
    "pstRate": 7.00
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "date": "2025-12-14",
  "description": "Office supplies",
  "subtotal": 100.00,
  "gstRate": 5.00,
  "pstRate": 7.00,
  "gstAmount": 5.00,
  "pstAmount": 7.00,
  "total": 112.00,
  "categoryId": 1,
  ...
}
```

### Get Expense (Verify Tax Fields)

```bash
curl http://localhost:3000/api/expenses/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Response**:
- ✅ `gstRate`, `pstRate`, `gstAmount`, `pstAmount` present in response
- ✅ `total` = subtotal + gstAmount + pstAmount

### List Expenses (Filter by Tax Status)

```bash
# Get expenses with taxes only
curl "http://localhost:3000/api/expenses?withTax=true" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Response**:
- ✅ Only expenses where `gstRate` OR `pstRate` is not null

---

## Database Inspection

### Check Migration Applied

```bash
cd backend

# Verify migration ran
npx prisma migrate status
```

**Expected output**:
```
Database migrations:
  ✓ V3.0.0__add_gst_pst_taxes.sql (applied)
```

### Inspect Table Schema

```bash
psql -U postgres -d expense_tracker -c "\d expenses;"
psql -U postgres -d expense_tracker -c "\d expense_items;"
```

**Expected columns**:
- `gst_rate`, `pst_rate` (NUMERIC 5,2, nullable)
- `gst_amount`, `pst_amount` (NUMERIC 12,2, default 0)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Expense not found" error when creating** | Ensure JWT token is valid and user is logged in. Check backend logs. |
| **Tax fields not appearing in UI form** | Rebuild frontend (`npm run build`) or clear `.vite` cache. Check browser DevTools console. |
| **Tax amounts incorrect** | Verify calculation logic in `ExpensesService.calculateTaxes()`. Run unit tests to isolate. |
| **E2E tests timing out** | Ensure services are running; increase Playwright timeout in `e2e/playwright.config.ts`. |
| **Database migration fails** | Check PostgreSQL is running; reset DB with `npx prisma migrate reset` (dev only). |

---

## Next Steps

1. **Implement** backend service logic and DTOs (see [plan.md](../plan.md) Task 3-4)
2. **Add** unit tests for calculations (Task 5)
3. **Implement** frontend forms and API integration (Task 7-8)
4. **Add** E2E tests for full workflows (Task 11)
5. **Run** full test suite and validate coverage (Task 12)
6. **Submit PR** for review (Task 14)

---

## References

- **Spec**: [spec.md](../spec.md)
- **Data Model**: [data-model.md](../data-model.md)
- **API Contracts**: [contracts/api.md](../contracts/api.md)
- **Constitution**: [../../.specify/memory/constitution.md](../../.specify/memory/constitution.md)
- **Plan**: [plan.md](../plan.md)
