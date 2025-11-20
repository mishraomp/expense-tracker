-- Add budgets to categories and subcategories
-- Creates a PostgreSQL enum type for budget period and nullable columns for amount/period

-- Create enum type for budget period
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_period') THEN
        CREATE TYPE budget_period AS ENUM ('monthly', 'annual');
    END IF;
END$$;

-- Add budget columns to categories
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS budget_period budget_period;

-- Add budget columns to subcategories
ALTER TABLE subcategories
    ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS budget_period budget_period;

-- Optional: comments for clarity
COMMENT ON COLUMN categories.budget_amount IS 'Optional budget amount for this category';
COMMENT ON COLUMN categories.budget_period IS 'Optional budget period for this category (monthly/annual)';
COMMENT ON COLUMN subcategories.budget_amount IS 'Optional budget amount for this subcategory';
COMMENT ON COLUMN subcategories.budget_period IS 'Optional budget period for this subcategory (monthly/annual)';
