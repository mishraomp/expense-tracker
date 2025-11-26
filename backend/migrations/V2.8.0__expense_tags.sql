-- ============================================================================
-- V2.8.0: Expense Tags
-- ============================================================================
-- Add tagging system for flexible expense categorization
-- Tags are user-scoped and can be applied to expenses and expense items
-- ============================================================================

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color_code VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tags_user_name UNIQUE (user_id, name)
);

-- Indexes for tags
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- Junction table for expense-tag associations
CREATE TABLE expense_tags (
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (expense_id, tag_id)
);

-- Indexes for expense_tags
CREATE INDEX idx_expense_tags_expense_id ON expense_tags(expense_id);
CREATE INDEX idx_expense_tags_tag_id ON expense_tags(tag_id);

-- Junction table for expense-item-tag associations (Phase 2, but create now)
CREATE TABLE expense_item_tags (
    expense_item_id UUID NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (expense_item_id, tag_id)
);

-- Indexes for expense_item_tags
CREATE INDEX idx_expense_item_tags_expense_item_id ON expense_item_tags(expense_item_id);
CREATE INDEX idx_expense_item_tags_tag_id ON expense_item_tags(tag_id);

-- Trigger to update updated_at on tags
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tags_updated_at();

-- Comments for documentation
COMMENT ON TABLE tags IS 'User-defined tags for flexible expense categorization';
COMMENT ON TABLE expense_tags IS 'Many-to-many relationship between expenses and tags';
COMMENT ON TABLE expense_item_tags IS 'Many-to-many relationship between expense items and tags';
COMMENT ON COLUMN tags.color_code IS 'Hex color code for visual distinction (e.g., #FF5733)';
