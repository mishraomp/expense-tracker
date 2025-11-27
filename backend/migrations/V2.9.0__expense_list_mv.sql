-- V2.9.0__expense_list_mv.sql
-- Create materialized view for expense list with all fields needed for search, filter, sort, paginate
-- This MV pre-joins expenses with categories, subcategories, tags, attachments, and items
-- and is refreshed on expense CRUD operations

-- ============================================================================
-- 0. ENABLE REQUIRED EXTENSIONS
-- ============================================================================

-- Enable pg_trgm extension for trigram-based full-text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. CREATE MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW mv_expense_list AS
SELECT
    -- Core expense fields
    e.id AS expense_id,
    e.user_id,
    e.category_id,
    e.subcategory_id,
    e.amount,
    e.date,
    e.description,
    e.source,
    e.status,
    e.merchant_name,
    e.created_at,
    e.updated_at,
    e.deleted_at,
    
    -- Category fields (denormalized for fast filtering/display)
    c.name AS category_name,
    c.type AS category_type,
    c.color_code AS category_color,
    c.icon AS category_icon,
    
    -- Subcategory fields (denormalized)
    sc.name AS subcategory_name,
    
    -- Aggregated tags as JSON array for filtering and display
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'name', t.name,
                    'colorCode', t.color_code
                )
                ORDER BY t.name
            )
            FROM expense_tags et
            INNER JOIN tags t ON et.tag_id = t.id
            WHERE et.expense_id = e.id
        ),
        '[]'::jsonb
    ) AS tags,
    
    -- Tag IDs as array for efficient filtering
    COALESCE(
        (
            SELECT array_agg(et.tag_id)
            FROM expense_tags et
            WHERE et.expense_id = e.id
        ),
        ARRAY[]::uuid[]
    ) AS tag_ids,
    
    -- Attachment count
    COALESCE(
        (
            SELECT COUNT(*)::int
            FROM attachments a
            WHERE a.linked_expense_id = e.id
              AND a.status = 'ACTIVE'
        ),
        0
    ) AS attachment_count,
    
    -- Item count
    COALESCE(
        (
            SELECT COUNT(*)::int
            FROM expense_items ei
            WHERE ei.expense_id = e.id
              AND ei.deleted_at IS NULL
        ),
        0
    ) AS item_count,
    
    -- Item names concatenated for text search
    COALESCE(
        (
            SELECT string_agg(ei.name, ' ')
            FROM expense_items ei
            WHERE ei.expense_id = e.id
              AND ei.deleted_at IS NULL
        ),
        ''
    ) AS item_names_text,
    
    -- Full-text search vector for description + item names
    to_tsvector('english', 
        COALESCE(e.description, '') || ' ' || 
        COALESCE(
            (
                SELECT string_agg(ei.name, ' ')
                FROM expense_items ei
                WHERE ei.expense_id = e.id
                  AND ei.deleted_at IS NULL
            ),
            ''
        )
    ) AS search_vector

FROM expenses e
LEFT JOIN categories c ON e.category_id = c.id
LEFT JOIN subcategories sc ON e.subcategory_id = sc.id
WHERE e.deleted_at IS NULL;

-- Add comment
COMMENT ON MATERIALIZED VIEW mv_expense_list IS 
    'Denormalized expense list for fast filtering, sorting, and pagination. Refreshed on expense CRUD.';

-- ============================================================================
-- 2. CREATE INDEXES ON MATERIALIZED VIEW
-- ============================================================================

-- Primary lookup index
CREATE UNIQUE INDEX idx_mv_expense_list_id ON mv_expense_list (expense_id);

-- User + date filtering (most common query pattern)
CREATE INDEX idx_mv_expense_list_user_date ON mv_expense_list (user_id, date DESC);

-- User + amount for amount sorting
CREATE INDEX idx_mv_expense_list_user_amount ON mv_expense_list (user_id, amount DESC);

-- Category filtering
CREATE INDEX idx_mv_expense_list_user_category ON mv_expense_list (user_id, category_id);

-- Subcategory filtering
CREATE INDEX idx_mv_expense_list_user_subcategory ON mv_expense_list (user_id, subcategory_id) 
    WHERE subcategory_id IS NOT NULL;

-- Tag filtering using GIN index on array
CREATE INDEX idx_mv_expense_list_tag_ids ON mv_expense_list USING GIN (tag_ids);

-- Full-text search index
CREATE INDEX idx_mv_expense_list_search ON mv_expense_list USING GIN (search_vector);

-- Item name text search (ILIKE pattern matching)
CREATE INDEX idx_mv_expense_list_item_names ON mv_expense_list USING GIN (item_names_text gin_trgm_ops);

-- ============================================================================
-- 3. CREATE REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_expense_list_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- CONCURRENTLY allows reads during refresh (requires unique index)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_expense_list;
END;
$$;

COMMENT ON FUNCTION refresh_expense_list_mv() IS 
    'Refreshes the expense list materialized view. Called after expense CRUD operations.';

-- ============================================================================
-- 4. CREATE TRIGGER FUNCTION FOR AUTO-REFRESH
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_expense_list_mv()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use pg_notify for async refresh (non-blocking)
    -- The actual refresh is handled by a listener or can be synchronous
    -- For simplicity, we do synchronous refresh here
    -- In production with high volume, consider async refresh via pg_notify + worker
    PERFORM refresh_expense_list_mv();
    RETURN NULL;
END;
$$;

-- ============================================================================
-- 5. CREATE TRIGGERS ON EXPENSES TABLE
-- ============================================================================

-- Trigger on INSERT
CREATE TRIGGER trg_expense_insert_refresh_mv
    AFTER INSERT ON expenses
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_expense_list_mv();

-- Trigger on UPDATE
CREATE TRIGGER trg_expense_update_refresh_mv
    AFTER UPDATE ON expenses
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_expense_list_mv();

-- Trigger on DELETE
CREATE TRIGGER trg_expense_delete_refresh_mv
    AFTER DELETE ON expenses
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_expense_list_mv();

-- ============================================================================
-- 6. CREATE TRIGGERS ON RELATED TABLES (for tag/item/attachment changes)
-- ============================================================================

-- Trigger on expense_tags changes
CREATE TRIGGER trg_expense_tags_refresh_mv
    AFTER INSERT OR UPDATE OR DELETE ON expense_tags
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_expense_list_mv();

-- Trigger on expense_items changes
CREATE TRIGGER trg_expense_items_refresh_mv
    AFTER INSERT OR UPDATE OR DELETE ON expense_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_expense_list_mv();

-- Trigger on attachments changes (when linked to expense)
CREATE OR REPLACE FUNCTION trigger_refresh_mv_on_attachment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only refresh if the attachment is linked to an expense
    IF (TG_OP = 'DELETE' AND OLD.linked_expense_id IS NOT NULL) OR
       (TG_OP = 'INSERT' AND NEW.linked_expense_id IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND (OLD.linked_expense_id IS NOT NULL OR NEW.linked_expense_id IS NOT NULL)) THEN
        PERFORM refresh_expense_list_mv();
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_attachments_refresh_mv
    AFTER INSERT OR UPDATE OR DELETE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_mv_on_attachment_change();

-- ============================================================================
-- 7. CATEGORY/SUBCATEGORY NAME CHANGES ALSO NEED REFRESH
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_mv_on_category_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only refresh if name, color, or icon changed
    IF TG_OP = 'UPDATE' AND (
        OLD.name IS DISTINCT FROM NEW.name OR
        OLD.color_code IS DISTINCT FROM NEW.color_code OR
        OLD.icon IS DISTINCT FROM NEW.icon
    ) THEN
        PERFORM refresh_expense_list_mv();
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_categories_refresh_mv
    AFTER UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_mv_on_category_change();

CREATE OR REPLACE FUNCTION trigger_refresh_mv_on_subcategory_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only refresh if name changed
    IF TG_OP = 'UPDATE' AND OLD.name IS DISTINCT FROM NEW.name THEN
        PERFORM refresh_expense_list_mv();
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_subcategories_refresh_mv
    AFTER UPDATE ON subcategories
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_mv_on_subcategory_change();

-- ============================================================================
-- 8. TAG NAME/COLOR CHANGES ALSO NEED REFRESH
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_mv_on_tag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only refresh if name or color changed
    IF TG_OP = 'UPDATE' AND (
        OLD.name IS DISTINCT FROM NEW.name OR
        OLD.color_code IS DISTINCT FROM NEW.color_code
    ) THEN
        PERFORM refresh_expense_list_mv();
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_tags_refresh_mv
    AFTER UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_mv_on_tag_change();

-- ============================================================================
-- 9. ENSURE pg_trgm EXTENSION EXISTS (for trigram text search)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
