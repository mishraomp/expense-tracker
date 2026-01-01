-- V3.3.0: Fix category budget report view to show all budget periods
-- Problem: The view was using DISTINCT ON to pick only one budget per category
-- Solution: Show all budget rows, one per budget period, allowing date-range filtering

-- =====================================================
-- PART 1: FIX CATEGORY BUDGET REPORT VIEW
-- =====================================================

-- Drop and recreate to change column types
DROP VIEW IF EXISTS vw_category_budget_report CASCADE;

CREATE VIEW vw_category_budget_report AS
WITH budget_periods AS (
    -- Get ALL budgets for each category (not just one per category)
    SELECT
        b.id AS budget_id,
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
),
period_spending AS (
    -- Sum expenses per category per budget period
    SELECT
        e.user_id,
        e.category_id,
        bp.budget_id,
        SUM(e.amount) AS total_spent
    FROM expenses e
    INNER JOIN budget_periods bp ON e.category_id = bp.category_id
        -- Only count expenses within the budget's date range
        AND e.date >= bp.start_date
        AND (bp.end_date IS NULL OR e.date <= bp.end_date)
    WHERE e.deleted_at IS NULL
        AND e.status = 'confirmed'
    GROUP BY e.user_id, e.category_id, bp.budget_id
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
    bp.budget_amount,
    bp.budget_period,
    -- Period metrics from budget definition
    bp.start_date AS period_start,
    bp.end_date AS period_end,
    COALESCE(ps.total_spent, 0) AS total_spent,
    CASE
        WHEN bp.budget_amount IS NOT NULL AND bp.budget_amount > 0 THEN
            ROUND((COALESCE(ps.total_spent, 0) / bp.budget_amount) * 100, 2)
        ELSE NULL
    END AS percent_used,
    CASE
        WHEN bp.budget_amount IS NOT NULL THEN
            bp.budget_amount - COALESCE(ps.total_spent, 0)
        ELSE NULL
    END AS remaining_budget,
    CASE
        WHEN bp.budget_amount IS NOT NULL THEN
            COALESCE(ps.total_spent, 0) > bp.budget_amount
        ELSE FALSE
    END AS is_over_budget,
    CASE
        WHEN bp.budget_amount IS NOT NULL AND COALESCE(ps.total_spent, 0) > bp.budget_amount THEN
            COALESCE(ps.total_spent, 0) - bp.budget_amount
        ELSE 0
    END AS over_budget_amount
FROM categories c
INNER JOIN budget_periods bp ON c.id = bp.category_id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN period_spending ps ON bp.budget_id = ps.budget_id
    AND (c.user_id = ps.user_id OR c.user_id IS NULL)
WHERE c.deleted_at IS NULL;

COMMENT ON VIEW vw_category_budget_report IS 'Category-level budget vs actual spending report. Shows all budget periods for date-range filtering.';


-- =====================================================
-- PART 2: FIX SUBCATEGORY BUDGET REPORT VIEW
-- =====================================================

-- Drop and recreate to change column types
DROP VIEW IF EXISTS vw_subcategory_budget_report CASCADE;

CREATE VIEW vw_subcategory_budget_report AS
WITH budget_periods AS (
    -- Get ALL budgets for each subcategory (not just one per subcategory)
    SELECT
        b.id AS budget_id,
        b.subcategory_id,
        b.amount AS budget_amount,
        b.start_date,
        b.end_date,
        -- Derive budget_period from date range
        CASE
            WHEN b.end_date = (b.start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE
                 AND EXTRACT(DAY FROM b.start_date) = 1
            THEN 'monthly'::budget_period
            WHEN b.end_date = (b.start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE
                 AND EXTRACT(MONTH FROM b.start_date) = 1
                 AND EXTRACT(DAY FROM b.start_date) = 1
            THEN 'annual'::budget_period
            ELSE NULL
        END AS budget_period
    FROM budgets b
    WHERE b.subcategory_id IS NOT NULL
),
period_spending AS (
    SELECT
        e.user_id,
        e.subcategory_id,
        bp.budget_id,
        SUM(e.amount) AS total_spent
    FROM expenses e
    INNER JOIN budget_periods bp ON e.subcategory_id = bp.subcategory_id
        AND e.date >= bp.start_date
        AND (bp.end_date IS NULL OR e.date <= bp.end_date)
    WHERE e.deleted_at IS NULL
        AND e.status = 'confirmed'
    GROUP BY e.user_id, e.subcategory_id, bp.budget_id
)
SELECT
    s.id AS subcategory_id,
    s.name AS subcategory_name,
    c.id AS category_id,
    c.name AS category_name,
    c.type AS category_type,
    c.color_code AS category_color,
    c.icon AS category_icon,
    c.user_id,
    u.email AS user_email,
    u.first_name,
    u.last_name,
    bp.budget_amount,
    bp.budget_period,
    bp.start_date AS period_start,
    bp.end_date AS period_end,
    COALESCE(ps.total_spent, 0) AS total_spent,
    CASE
        WHEN bp.budget_amount IS NOT NULL AND bp.budget_amount > 0 THEN
            ROUND((COALESCE(ps.total_spent, 0) / bp.budget_amount) * 100, 2)
        ELSE NULL
    END AS percent_used,
    CASE
        WHEN bp.budget_amount IS NOT NULL THEN
            bp.budget_amount - COALESCE(ps.total_spent, 0)
        ELSE NULL
    END AS remaining_budget,
    CASE
        WHEN bp.budget_amount IS NOT NULL THEN
            COALESCE(ps.total_spent, 0) > bp.budget_amount
        ELSE FALSE
    END AS is_over_budget,
    CASE
        WHEN bp.budget_amount IS NOT NULL AND COALESCE(ps.total_spent, 0) > bp.budget_amount THEN
            COALESCE(ps.total_spent, 0) - bp.budget_amount
        ELSE 0
    END AS over_budget_amount
FROM subcategories s
INNER JOIN categories c ON s.category_id = c.id
INNER JOIN budget_periods bp ON s.id = bp.subcategory_id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN period_spending ps ON bp.budget_id = ps.budget_id
    AND (c.user_id = ps.user_id OR c.user_id IS NULL)
WHERE c.deleted_at IS NULL;

COMMENT ON VIEW vw_subcategory_budget_report IS 'Subcategory-level budget vs actual spending report. Shows all budget periods for date-range filtering.';
