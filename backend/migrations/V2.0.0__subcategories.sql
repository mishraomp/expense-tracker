-- V2.0.0__subcategories.sql
-- Add subcategories table, update categories and expenses for subcategory support

-- 1. Create subcategories table
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subcategories_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT idx_subcategories_category_name_unique UNIQUE (category_id, name)
);

CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);

-- 2. Add subcategory_id to expenses
ALTER TABLE expenses ADD COLUMN subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;
CREATE INDEX idx_expenses_subcategory_id ON expenses(subcategory_id);
CREATE INDEX idx_expenses_user_subcategory ON expenses(user_id, subcategory_id);

-- 3. Add CHECK constraint for category-subcategory consistency


-- 4. Trigger to update updated_at on subcategories
CREATE OR REPLACE FUNCTION update_subcategories_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subcategories_updated_at ON subcategories;
CREATE TRIGGER trigger_subcategories_updated_at
BEFORE UPDATE ON subcategories
FOR EACH ROW
EXECUTE FUNCTION update_subcategories_updated_at_column();

-- 5. Trigger to enforce 50 subcategories per category
CREATE OR REPLACE FUNCTION enforce_subcategory_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM subcategories WHERE category_id = NEW.category_id) >= 50 THEN
    RAISE EXCEPTION 'Cannot create more than 50 subcategories per category';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_subcategory_limit ON subcategories;
CREATE TRIGGER trigger_enforce_subcategory_limit
BEFORE INSERT ON subcategories
FOR EACH ROW
EXECUTE FUNCTION enforce_subcategory_limit();
