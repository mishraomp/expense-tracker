# Phase 1 - Data Model: Separate Budget Entity

## Status: IMPLEMENTED

The budget refactoring is complete. Categories and subcategories now use the \udgets\ table for budget storage.

## Entities

### Budget

Represents a planned spending limit for a date range, attached to a category or subcategory.

**Fields (as implemented in V3.2.0)**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| \id\ | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| \mount\ | NUMERIC(15,2) | NOT NULL, >= 0 | Budget amount |
| \start_date\ | DATE | NOT NULL | Budget period start |
| \end_date\ | DATE | NOT NULL, >= start_date | Budget period end |
| \category_id\ | UUID | FK - categories, nullable | Category reference |
| \subcategory_id\ | UUID | FK - subcategories, nullable | Subcategory reference |
| \user_id\ | UUID | FK - users, nullable | User owner (null for predefined) |
| \created_at\ | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| \updated_at\ | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Constraints (implemented)**

- \chk_budget_parent\: Exactly one of (\category_id\, \subcategory_id\) MUST be set (XOR constraint)
- \chk_budget_dates\: \start_date\ <= \end_date\
- \chk_budget_amount\: \mount\ >= 0
- ON DELETE CASCADE for both category_id and subcategory_id FKs

**Indexes (implemented)**

- \idx_budgets_category_overlap\: \(category_id, start_date, end_date, updated_at DESC)\ - for active budget lookups
- \idx_budgets_subcategory_overlap\: \(subcategory_id, start_date, end_date, updated_at DESC)\ - for active budget lookups
- \idx_budgets_user\: \(user_id)\ - for user-scoped queries

**Overlap handling**

- Overlapping budgets are allowed.
- Active budget selection rule for a date is: among budgets where \start_date <= date <= end_date\, pick the one with greatest \updated_at\ (tie-breaker: greatest \created_at\, then greatest \id\).
- **Subcategory budget takes precedence** over category budget when both exist.

## API Fields (Response)

Categories and subcategories now return these budget-related fields:

| Field | Type | Description |
|-------|------|-------------|
| \udgetAmount\ | string or null | Active budget amount as decimal string |
| \udgetPeriod\ | 'monthly' or 'annual' or null | Derived for legacy compatibility |
| \udgetStartDate\ | string or null | ISO date (YYYY-MM-DD) for budget start |
| \udgetEndDate\ | string or null | ISO date (YYYY-MM-DD) for budget end |

## API Fields (Request)

Create/update requests accept:

| Field | Type | Description |
|-------|------|-------------|
| \udgetAmount\ | number | Budget amount (required for budget) |
| \udgetPeriod\ | 'monthly' or 'annual' | Legacy period selector (mutually exclusive with dates) |
| \udgetStartDate\ | string | Explicit start date (requires budgetEndDate) |
| \udgetEndDate\ | string | Explicit end date (requires budgetStartDate) |

## Relationships

- Category 1-N Budget (via \udgets.category_id\, ON DELETE CASCADE)
- Subcategory 1-N Budget (via \udgets.subcategory_id\, ON DELETE CASCADE)

## Migration Details (V3.2.0)

**Backfill from legacy columns:**

- Categories with \udget_amount IS NOT NULL\ -> Budget with wide range (1970-01-01 to 9999-12-31)
- Subcategories with \udget_amount IS NOT NULL\ -> Budget with wide range (1970-01-01 to 9999-12-31)

**Legacy columns dropped:**

- \categories.budget_amount\
- \categories.budget_period\
- \subcategories.budget_amount\
- \subcategories.budget_period\
- \udget_period\ enum type

**Views updated:**

- \_category_budget_report\ - uses \udgets\ table
- \_subcategory_budget_report\ - uses \udgets\ table
- \_expense_list\ (materialized view) - no longer references legacy columns

## Date Range Computation

The \computeBudgetDateRange()\ helper determines budget dates:

1. **Explicit dates**: If \udgetStartDate\ AND \udgetEndDate\ provided, use them
2. **Monthly period**: Current month (1st to last day)
3. **Annual period**: Current year (Jan 1 to Dec 31)
4. **Default (no period)**: Wide range (1970-01-01 to 9999-12-31) for recurring budgets
