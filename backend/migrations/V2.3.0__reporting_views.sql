-- V2.3.0__reporting_views.sql
-- Create materialized views for Metabase reporting on budget vs actual spending

-- 1. Category Budget Report View
-- Shows overall spending per category with budget tracking
CREATE OR REPLACE VIEW vw_category_budget_report AS
WITH period_spending AS (
    SELECT
        e.user_id,
        e.category_id,
        c.budget_period,
        CASE 
            WHEN c.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
            WHEN c.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
            ELSE DATE_TRUNC('year', e.date)
        END AS period_start,
        SUM(e.amount) AS total_spent
    FROM expenses e
    INNER JOIN categories c ON e.category_id = c.id
    WHERE e.deleted_at IS NULL
        AND e.status = 'confirmed'
    GROUP BY e.user_id, e.category_id, c.budget_period,
             CASE 
                WHEN c.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
                WHEN c.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
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
    c.budget_amount,
    c.budget_period,
    -- Period metrics
    ps.period_start,
    CASE 
        WHEN c.budget_period = 'monthly' THEN 
            (ps.period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
        WHEN c.budget_period = 'annual' THEN 
            (ps.period_start + INTERVAL '1 year' - INTERVAL '1 day')::DATE
        ELSE NULL
    END AS period_end,
    COALESCE(ps.total_spent, 0) AS total_spent,
    CASE
        WHEN c.budget_amount IS NOT NULL AND c.budget_amount > 0 THEN
            ROUND((COALESCE(ps.total_spent, 0) / c.budget_amount) * 100, 2)
        ELSE NULL
    END AS percent_used,
    CASE
        WHEN c.budget_amount IS NOT NULL THEN
            c.budget_amount - COALESCE(ps.total_spent, 0)
        ELSE NULL
    END AS remaining_budget,
    CASE
        WHEN c.budget_amount IS NOT NULL THEN
            COALESCE(ps.total_spent, 0) > c.budget_amount
        ELSE FALSE
    END AS is_over_budget,
    CASE
        WHEN c.budget_amount IS NOT NULL AND COALESCE(ps.total_spent, 0) > c.budget_amount THEN
            COALESCE(ps.total_spent, 0) - c.budget_amount
        ELSE 0
    END AS over_budget_amount
FROM categories c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN period_spending ps ON c.id = ps.category_id 
    AND (c.user_id = ps.user_id OR c.user_id IS NULL)
WHERE c.deleted_at IS NULL
    AND c.budget_amount IS NOT NULL;

COMMENT ON VIEW vw_category_budget_report IS 'Category-level budget vs actual spending report for Metabase dashboards';

-- 2. Subcategory Budget Report View
-- Shows overall spending per subcategory with budget tracking
CREATE OR REPLACE VIEW vw_subcategory_budget_report AS
WITH period_spending AS (
    SELECT
        e.user_id,
        e.subcategory_id,
        sc.budget_period,
        CASE 
            WHEN sc.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
            WHEN sc.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
            ELSE DATE_TRUNC('year', e.date)
        END AS period_start,
        SUM(e.amount) AS total_spent
    FROM expenses e
    INNER JOIN subcategories sc ON e.subcategory_id = sc.id
    WHERE e.deleted_at IS NULL
        AND e.status = 'confirmed'
        AND e.subcategory_id IS NOT NULL
    GROUP BY e.user_id, e.subcategory_id, sc.budget_period,
             CASE 
                WHEN sc.budget_period = 'monthly' THEN DATE_TRUNC('month', e.date)
                WHEN sc.budget_period = 'annual' THEN DATE_TRUNC('year', e.date)
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
    sc.budget_amount,
    sc.budget_period,
    -- Period metrics
    ps.period_start,
    CASE 
        WHEN sc.budget_period = 'monthly' THEN 
            (ps.period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
        WHEN sc.budget_period = 'annual' THEN 
            (ps.period_start + INTERVAL '1 year' - INTERVAL '1 day')::DATE
        ELSE NULL
    END AS period_end,
    COALESCE(ps.total_spent, 0) AS total_spent,
    CASE
        WHEN sc.budget_amount IS NOT NULL AND sc.budget_amount > 0 THEN
            ROUND((COALESCE(ps.total_spent, 0) / sc.budget_amount) * 100, 2)
        ELSE NULL
    END AS percent_used,
    CASE
        WHEN sc.budget_amount IS NOT NULL THEN
            sc.budget_amount - COALESCE(ps.total_spent, 0)
        ELSE NULL
    END AS remaining_budget,
    CASE
        WHEN sc.budget_amount IS NOT NULL THEN
            COALESCE(ps.total_spent, 0) > sc.budget_amount
        ELSE FALSE
    END AS is_over_budget,
    CASE
        WHEN sc.budget_amount IS NOT NULL AND COALESCE(ps.total_spent, 0) > sc.budget_amount THEN
            COALESCE(ps.total_spent, 0) - sc.budget_amount
        ELSE 0
    END AS over_budget_amount
FROM subcategories sc
INNER JOIN categories c ON sc.category_id = c.id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN period_spending ps ON sc.id = ps.subcategory_id 
    AND (c.user_id = ps.user_id OR c.user_id IS NULL)
WHERE sc.budget_amount IS NOT NULL;

COMMENT ON VIEW vw_subcategory_budget_report IS 'Subcategory-level budget vs actual spending report for Metabase dashboards';

-- 3. Create indexes on commonly filtered columns for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_date_user_category 
    ON expenses(date, user_id, category_id) 
    WHERE deleted_at IS NULL AND status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_expenses_date_user_subcategory 
    ON expenses(date, user_id, subcategory_id) 
    WHERE deleted_at IS NULL AND status = 'confirmed' AND subcategory_id IS NOT NULL;
