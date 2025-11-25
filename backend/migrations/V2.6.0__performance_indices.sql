-- V2.6.0__performance_indices.sql
-- Add performance indices based on query optimization analysis
-- See: specs/001-improve-tests-performance/query-optimization-analysis.md

-- ==============================================================================
-- EXPENSES TABLE OPTIMIZATIONS
-- ==============================================================================

-- 1. Composite index for expense list pagination with category join
-- Supports: ExpensesService.findAll() with ORDER BY date DESC
-- Impact: 30-40% improvement on expense list queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category_amount 
ON expenses(user_id, date DESC, category_id, amount DESC) 
WHERE deleted_at IS NULL;

-- 2. Covering index for quick expense totals (Index-Only Scan optimization)
-- Supports: ExpensesService.calculateTotals() and report aggregations
-- Impact: 50-60% improvement on summary calculations
CREATE INDEX IF NOT EXISTS idx_expenses_user_amount_covering 
ON expenses(user_id, amount) 
INCLUDE (date, category_id, subcategory_id) 
WHERE deleted_at IS NULL;

-- 3. Composite index for report date range queries
-- Supports: All report endpoints that filter by date range first
-- Impact: 25-35% improvement on date range reports
CREATE INDEX IF NOT EXISTS idx_expenses_daterange_category 
ON expenses(date, user_id, category_id, amount) 
WHERE deleted_at IS NULL;

-- 4. Composite index for subcategory-filtered queries
-- Supports: Report queries filtering by subcategory
-- Impact: 20-25% improvement on subcategory reports
CREATE INDEX IF NOT EXISTS idx_expenses_date_subcategory 
ON expenses(date, subcategory_id, amount)
WHERE deleted_at IS NULL AND subcategory_id IS NOT NULL;

-- ==============================================================================
-- INCOMES TABLE OPTIMIZATIONS
-- ==============================================================================

-- 5. Composite index for income vs expense reports
-- Supports: ReportsService.getIncomeVsExpense() date aggregations
-- Impact: 20-30% improvement on income reports
CREATE INDEX IF NOT EXISTS idx_incomes_user_date_amount 
ON incomes(user_id, date DESC, amount) 
WHERE deleted_at IS NULL;

-- 6. Covering index for income totals (Index-Only Scan optimization)
-- Supports: Quick income aggregations without table access
-- Impact: 40-50% improvement on income summary queries
CREATE INDEX IF NOT EXISTS idx_incomes_user_amount_covering 
ON incomes(user_id, amount) 
INCLUDE (date, source, frequency) 
WHERE deleted_at IS NULL;

-- ==============================================================================
-- ATTACHMENTS TABLE OPTIMIZATIONS
-- ==============================================================================

-- 7. Composite index for attachment count queries
-- Supports: ExpensesService.findAll() attachment count aggregation
-- Impact: 30-40% improvement when loading expense lists with attachment counts
CREATE INDEX IF NOT EXISTS idx_attachments_expense_status 
ON attachments(linked_expense_id, status) 
WHERE linked_expense_id IS NOT NULL;

-- 8. Composite index for income attachment queries
-- Supports: Income detail pages with attachment counts
-- Impact: 30-40% improvement for income attachment queries
CREATE INDEX IF NOT EXISTS idx_attachments_income_status 
ON attachments(linked_income_id, status) 
WHERE linked_income_id IS NOT NULL;

-- ==============================================================================
-- CATEGORIES & SUBCATEGORIES OPTIMIZATIONS
-- ==============================================================================

-- 9. Composite index for category lookups by name and user
-- Supports: Bulk import category resolution
-- Impact: 50-60% improvement in bulk create operations
CREATE INDEX IF NOT EXISTS idx_categories_name_user_type 
ON categories(name, user_id, type) 
WHERE deleted_at IS NULL;

-- 10. Composite index for subcategory lookups by name and category
-- Supports: Bulk import subcategory resolution
-- Impact: 50-60% improvement in bulk create operations
CREATE INDEX IF NOT EXISTS idx_subcategories_name_category 
ON subcategories(name, category_id);
