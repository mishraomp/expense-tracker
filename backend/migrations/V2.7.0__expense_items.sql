-- V2.7.0__expense_items.sql
-- Add expense_items table to track individual line items within expenses

-- 1. Create expense_items table
CREATE TABLE expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT expense_items_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT expense_items_name_max_length CHECK (length(name) <= 200),
    CONSTRAINT expense_items_amount_positive CHECK (amount > 0)
);

-- 2. Create indexes for performance
CREATE INDEX idx_expense_items_expense_id ON expense_items(expense_id);
CREATE INDEX idx_expense_items_category_id ON expense_items(category_id);
CREATE INDEX idx_expense_items_subcategory_id ON expense_items(subcategory_id);
CREATE INDEX idx_expense_items_deleted_at ON expense_items(deleted_at) WHERE deleted_at IS NULL;

-- 3. Create GIN index for full-text search on item name
CREATE INDEX idx_expense_items_name_search ON expense_items USING gin(to_tsvector('english', name));

-- 4. Composite index for common query patterns
CREATE INDEX idx_expense_items_expense_deleted ON expense_items(expense_id, deleted_at) WHERE deleted_at IS NULL;

-- 5. Trigger to update updated_at on expense_items
CREATE OR REPLACE FUNCTION update_expense_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expense_items_updated_at ON expense_items;
CREATE TRIGGER trigger_expense_items_updated_at
BEFORE UPDATE ON expense_items
FOR EACH ROW
EXECUTE FUNCTION update_expense_items_updated_at_column();

-- 6. Trigger to enforce 100 items per expense limit
CREATE OR REPLACE FUNCTION enforce_expense_items_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM expense_items WHERE expense_id = NEW.expense_id AND deleted_at IS NULL) >= 100 THEN
    RAISE EXCEPTION 'Cannot create more than 100 items per expense';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_expense_items_limit ON expense_items;
CREATE TRIGGER trigger_enforce_expense_items_limit
BEFORE INSERT ON expense_items
FOR EACH ROW
EXECUTE FUNCTION enforce_expense_items_limit();

-- 7. Trigger to cascade soft delete from expenses to items
CREATE OR REPLACE FUNCTION cascade_expense_soft_delete_to_items()
RETURNS TRIGGER AS $$
BEGIN
  -- When expense is soft-deleted, soft-delete all its items
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE expense_items 
    SET deleted_at = NEW.deleted_at 
    WHERE expense_id = NEW.id AND deleted_at IS NULL;
  END IF;
  -- When expense is restored, restore all its items
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    UPDATE expense_items 
    SET deleted_at = NULL 
    WHERE expense_id = NEW.id AND deleted_at = OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cascade_expense_soft_delete ON expenses;
CREATE TRIGGER trigger_cascade_expense_soft_delete
AFTER UPDATE OF deleted_at ON expenses
FOR EACH ROW
EXECUTE FUNCTION cascade_expense_soft_delete_to_items();

-- 8. Add comment for documentation
COMMENT ON TABLE expense_items IS 'Individual line items within expense transactions, enabling split receipts across categories';
COMMENT ON COLUMN expense_items.name IS 'Item description (e.g., "tshirt", "milk")';
COMMENT ON COLUMN expense_items.amount IS 'Item amount (must be positive, sum should not exceed parent expense total)';
COMMENT ON COLUMN expense_items.category_id IS 'Optional item-level category (can differ from parent expense)';
COMMENT ON COLUMN expense_items.subcategory_id IS 'Optional item-level subcategory';
COMMENT ON COLUMN expense_items.notes IS 'Additional notes for the item';
