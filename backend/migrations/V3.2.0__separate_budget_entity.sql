-- V3.2.0__separate_budget_entity.sql
-- Refactor: Create separate budgets table and migrate budget data from categories/subcategories
-- This migration maintains backward compatibility for all existing views and API behavior

-- =====================================================
-- PART 1: CREATE BUDGETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    category_id UUID,
    subcategory_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    -- Exactly one of category_id or subcategory_id must be set
    CONSTRAINT chk_budget_entity_exclusive CHECK (
        (category_id IS NOT NULL AND subcategory_id IS NULL) OR
        (category_id IS NULL AND subcategory_id IS NOT NULL)
    ),

    -- start_date must be <= end_date
    CONSTRAINT chk_budget_date_range CHECK (start_date <= end_date),

    -- Foreign keys
    CONSTRAINT fk_budgets_category FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT fk_budgets_subcategory FOREIGN KEY (subcategory_id)
        REFERENCES subcategories(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT fk_budgets_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

-- =====================================================
-- PART 2: CREATE INDEXES FOR BUDGET LOOKUPS
-- =====================================================

-- Index for category budget lookups (active budget for date range)
CREATE INDEX IF NOT EXISTS idx_budgets_category_lookup
    ON budgets(category_id, start_date, end_date, updated_at DESC)
    WHERE category_id IS NOT NULL;

-- Index for subcategory budget lookups (active budget for date range)
CREATE INDEX IF NOT EXISTS idx_budgets_subcategory_lookup
    ON budgets(subcategory_id, start_date, end_date, updated_at DESC)
    WHERE subcategory_id IS NOT NULL;

-- Index for user-specific budget queries
CREATE INDEX IF NOT EXISTS idx_budgets_user_id
    ON budgets(user_id)
    WHERE user_id IS NOT NULL;

-- =====================================================
-- PART 3: BACKFILL BUDGETS FROM CATEGORIES
-- =====================================================

INSERT INTO budgets (amount, start_date, end_date, category_id, subcategory_id, user_id, created_at, updated_at)
SELECT
    c.budget_amount,
    DATE '1970-01-01',
    DATE '9999-12-31',
    c.id,
    NULL,
    c.user_id,
    NOW(),
    NOW()
FROM categories c
WHERE c.budget_amount IS NOT NULL
  AND c.deleted_at IS NULL;

-- =====================================================
-- PART 4: BACKFILL BUDGETS FROM SUBCATEGORIES
-- =====================================================

INSERT INTO budgets (amount, start_date, end_date, category_id, subcategory_id, user_id, created_at, updated_at)
SELECT
    sc.budget_amount,
    DATE '1970-01-01',
    DATE '9999-12-31',
    NULL,
    sc.id,
    c.user_id,
    NOW(),
    NOW()
FROM subcategories sc
INNER JOIN categories c ON sc.category_id = c.id
WHERE sc.budget_amount IS NOT NULL;

-- =====================================================
-- PART 5: UPDATE CATEGORY BUDGET REPORT VIEW
-- =====================================================
-- Maintains same output schema: budget_amount, budget_period, period_start, period_end, etc.
-- Derives budget_period from date range for backward compatibility

CREATE OR REPLACE VIEW vw_category_budget_report AS
WITH active_budgets AS (
    -- Get the most recently updated budget for each category
    -- Using DISTINCT ON to pick the best budget per category
    SELECT DISTINCT ON (b.category_id)
        b.category_id,
        b.amount AS budget_amount,
        b.start_date,
        b.end_date,
        -- Derive budget_period from date range for backward compatibility
        CASE
            -- Monthly: exactly one calendar month
            WHEN b.end_date = (b.start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE
                 AND EXTRACT(DAY FROM b.start_date) = 1
            THEN 'monthly'::budget_period
            -- Annual: exactly one calendar year
            WHEN b.end_date = (b.start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE
                 AND EXTRACT(MONTH FROM b.start_date) = 1
                 AND EXTRACT(DAY FROM b.start_date) = 1
            THEN 'annual'::budget_period
            -- Wide range or other: NULL (legacy recurring behavior)
            ELSE NULL
        END AS budget_period
    FROM budgets b
    WHERE b.category_id IS NOT NULL
    ORDER BY b.category_id, b.updated_at DESC, b.created_at DESC, b.id DESC
),
period_spending AS (
    SELECT
        e.user_id,
        e.category_id,
        ab.budget_period,
        CASE 
            WHEN ab.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
            WHEN ab.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
            ELSE DATE_TRUNC('year', e.date)
        END AS period_start,
        SUM(e.amount) AS total_spent
    FROM expenses e
    INNER JOIN active_budgets ab ON e.category_id = ab.category_id
    WHERE e.deleted_at IS NULL
        AND e.status = 'confirmed'
    GROUP BY e.user_id, e.category_id, ab.budget_period,
             CASE 
                WHEN ab.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
                WHEN ab.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
                ELSE DATE_TRUNC('year', e.date)
             END
)
SELECT
    c.id AS category_id,
    c.name AS category_name,
    c.type AS category_type,
    c.color_code,
    c.icon,
    c.user_id,
    u.email AS user_email,
    u.first_name,
    u.last_name,
    ab.budget_amount,
    ab.budget_period,
    -- Period metrics
    ps.period_start,
    CASE 
        WHEN ab.budget_period = 'monthly' THEN 
            (ps.period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
        WHEN ab.budget_period = 'annual' THEN 
            (ps.period_start + INTERVAL '1 year' - INTERVAL '1 day')::DATE
        ELSE NULL
    END AS period_end,
    COALESCE(ps.total_spent, 0) AS total_spent,
    CASE
        WHEN ab.budget_amount IS NOT NULL AND ab.budget_amount > 0 THEN
            ROUND((COALESCE(ps.total_spent, 0) / ab.budget_amount) * 100, 2)
        ELSE NULL
    END AS percent_used,
    CASE
        WHEN ab.budget_amount IS NOT NULL THEN
            ab.budget_amount - COALESCE(ps.total_spent, 0)
        ELSE NULL
    END AS remaining_budget,
    CASE
        WHEN ab.budget_amount IS NOT NULL THEN
            COALESCE(ps.total_spent, 0) > ab.budget_amount
        ELSE FALSE
    END AS is_over_budget,
    CASE
        WHEN ab.budget_amount IS NOT NULL AND COALESCE(ps.total_spent, 0) > ab.budget_amount THEN
            COALESCE(ps.total_spent, 0) - ab.budget_amount
        ELSE 0
    END AS over_budget_amount
FROM categories c
INNER JOIN active_budgets ab ON c.id = ab.category_id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN period_spending ps ON c.id = ps.category_id 
    AND (c.user_id = ps.user_id OR c.user_id IS NULL)
WHERE c.deleted_at IS NULL;

COMMENT ON VIEW vw_category_budget_report IS 'Category-level budget vs actual spending report for Metabase dashboards. Reads from budgets table.';

-- =====================================================
-- PART 6: UPDATE SUBCATEGORY BUDGET REPORT VIEW
-- =====================================================
-- Maintains same output schema: budget_amount, budget_period, period_start, period_end, etc.
-- Derives budget_period from date range for backward compatibility

CREATE OR REPLACE VIEW vw_subcategory_budget_report AS
WITH active_budgets AS (
    -- Get the most recently updated budget for each subcategory
    SELECT DISTINCT ON (b.subcategory_id)
        b.subcategory_id,
        b.amount AS budget_amount,
        b.start_date,
        b.end_date,
        -- Derive budget_period from date range for backward compatibility
        CASE
            -- Monthly: exactly one calendar month
            WHEN b.end_date = (b.start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE
                 AND EXTRACT(DAY FROM b.start_date) = 1
            THEN 'monthly'::budget_period
            -- Annual: exactly one calendar year
            WHEN b.end_date = (b.start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE
                 AND EXTRACT(MONTH FROM b.start_date) = 1
                 AND EXTRACT(DAY FROM b.start_date) = 1
            THEN 'annual'::budget_period
            -- Wide range or other: NULL (legacy recurring behavior)
            ELSE NULL
        END AS budget_period
    FROM budgets b
    WHERE b.subcategory_id IS NOT NULL
    ORDER BY b.subcategory_id, b.updated_at DESC, b.created_at DESC, b.id DESC
),
period_spending AS (
    SELECT
        e.user_id,
        e.subcategory_id,
        ab.budget_period,
        CASE 
            WHEN ab.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
            WHEN ab.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
            ELSE DATE_TRUNC('year', e.date)
        END AS period_start,
        SUM(e.amount) AS total_spent
    FROM expenses e
    INNER JOIN active_budgets ab ON e.subcategory_id = ab.subcategory_id
    WHERE e.deleted_at IS NULL
        AND e.status = 'confirmed'
        AND e.subcategory_id IS NOT NULL
    GROUP BY e.user_id, e.subcategory_id, ab.budget_period,
             CASE 
                WHEN ab.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
                WHEN ab.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
                ELSE DATE_TRUNC('year', e.date)
             END
)
SELECT
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    sc.category_id,
    c.name AS category_name,
    c.type AS category_type,
    c.color_code AS category_color,
    c.icon AS category_icon,
    c.user_id,
    u.email AS user_email,
    u.first_name,
    u.last_name,
    ab.budget_amount,
    ab.budget_period,
    -- Period metrics
    ps.period_start,
    CASE 
        WHEN ab.budget_period = 'monthly' THEN 
            (ps.period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
        WHEN ab.budget_period = 'annual' THEN 
            (ps.period_start + INTERVAL '1 year' - INTERVAL '1 day')::DATE
        ELSE NULL
    END AS period_end,
    COALESCE(ps.total_spent, 0) AS total_spent,
    CASE
        WHEN ab.budget_amount IS NOT NULL AND ab.budget_amount > 0 THEN
            ROUND((COALESCE(ps.total_spent, 0) / ab.budget_amount) * 100, 2)
        ELSE NULL
    END AS percent_used,
    CASE
        WHEN ab.budget_amount IS NOT NULL THEN
            ab.budget_amount - COALESCE(ps.total_spent, 0)
        ELSE NULL
    END AS remaining_budget,
    CASE
        WHEN ab.budget_amount IS NOT NULL THEN
            COALESCE(ps.total_spent, 0) > ab.budget_amount
        ELSE FALSE
    END AS is_over_budget,
    CASE
        WHEN ab.budget_amount IS NOT NULL AND COALESCE(ps.total_spent, 0) > ab.budget_amount THEN
            COALESCE(ps.total_spent, 0) - ab.budget_amount
        ELSE 0
    END AS over_budget_amount
FROM subcategories sc
INNER JOIN active_budgets ab ON sc.id = ab.subcategory_id
INNER JOIN categories c ON sc.category_id = c.id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN period_spending ps ON sc.id = ps.subcategory_id 
    AND (c.user_id = ps.user_id OR c.user_id IS NULL);

COMMENT ON VIEW vw_subcategory_budget_report IS 'Subcategory-level budget vs actual spending report for Metabase dashboards. Reads from budgets table.';

-- =====================================================
-- PART 7: REFRESH MATERIALIZED VIEW
-- =====================================================
-- mv_expense_list does not contain budget columns, but we refresh it
-- to ensure any potential dependencies are up to date

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_expense_list;

-- =====================================================
-- PART 8: DROP LEGACY BUDGET COLUMNS
-- =====================================================
-- Remove deprecated budget_amount and budget_period from categories/subcategories

ALTER TABLE categories
    DROP COLUMN IF EXISTS budget_amount,
    DROP COLUMN IF EXISTS budget_period;

ALTER TABLE subcategories
    DROP COLUMN IF EXISTS budget_amount,
    DROP COLUMN IF EXISTS budget_period;

-- =====================================================
-- PART 9: DROP LEGACY BUDGET_PERIOD ENUM TYPE
-- =====================================================
-- Note: We keep the enum type as it's still used in views for backward compatibility
-- The views derive budget_period from date ranges but cast to budget_period type
-- If we wanted to remove it entirely, we'd need to change view output types

-- COMMENT: Keeping budget_period enum for view output compatibility
-- DROP TYPE IF EXISTS budget_period;

-- =====================================================
-- PART 10: ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE budgets IS 'Budget allocations with date ranges, linked to categories or subcategories';
COMMENT ON COLUMN budgets.id IS 'Unique identifier for the budget';
COMMENT ON COLUMN budgets.amount IS 'Budget amount (must be >= 0)';
COMMENT ON COLUMN budgets.start_date IS 'Start date of the budget period (inclusive)';
COMMENT ON COLUMN budgets.end_date IS 'End date of the budget period (inclusive)';
COMMENT ON COLUMN budgets.category_id IS 'Reference to category (mutually exclusive with subcategory_id)';
COMMENT ON COLUMN budgets.subcategory_id IS 'Reference to subcategory (mutually exclusive with category_id)';
COMMENT ON COLUMN budgets.user_id IS 'Owner of this budget (matches category/subcategory owner)';
COMMENT ON COLUMN budgets.created_at IS 'Timestamp when budget was created';
COMMENT ON COLUMN budgets.updated_at IS 'Timestamp when budget was last updated';
