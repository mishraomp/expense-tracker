-- Enforce expense de-duplication at the database level
-- Final strategy: remove any exact duplicates (by business key) and
-- add a partial unique composite index on:
--   (user_id, date, amount, lower(coalesce(description, '')))
-- Only consider non-deleted rows via WHERE deleted_at IS NULL.

-- 0) Cleanup any previous attempt at a generated column (if present)
ALTER TABLE expenses DROP COLUMN IF EXISTS dedup_key;

-- 1) Remove existing duplicates, keep the earliest created row
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, date, amount, lower(coalesce(description, ''))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM expenses
  WHERE deleted_at IS NULL
)
DELETE FROM expenses e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

-- 2) Create a partial unique index to prevent future duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_expenses_user_date_amount_desc_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_expenses_user_date_amount_desc_unique
             ON expenses (user_id, date, amount, lower(coalesce(description, '''')))
             WHERE deleted_at IS NULL';
  END IF;
END$$;