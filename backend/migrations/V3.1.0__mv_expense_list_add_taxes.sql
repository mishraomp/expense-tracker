-- V3.1.0__mv_expense_list_add_taxes.sql
-- Add GST/PST tax fields to the materialized view for expense list
-- This allows tax information to be displayed and filtered in the expense list

-- ============================================================================
-- 1. DROP AND RECREATE MATERIALIZED VIEW WITH TAX FIELDS
-- ============================================================================

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_mv_expense_list_id;
DROP INDEX IF EXISTS idx_mv_expense_list_user_date;
DROP INDEX IF EXISTS idx_mv_expense_list_user_amount;
DROP INDEX IF EXISTS idx_mv_expense_list_user_category;
DROP INDEX IF EXISTS idx_mv_expense_list_user_subcategory;
DROP INDEX IF EXISTS idx_mv_expense_list_tag_ids;
DROP INDEX IF EXISTS idx_mv_expense_list_search;
DROP INDEX IF EXISTS idx_mv_expense_list_item_names;

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_expense_list;

-- Recreate with tax fields
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
    
    -- Tax fields (NEW)
    e.gst_applicable,
    e.pst_applicable,
    e.gst_amount,
    e.pst_amount,
    
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
    'Denormalized expense list for fast filtering, sorting, and pagination. Includes tax fields. Refreshed on expense CRUD.';

-- ============================================================================
-- 2. RECREATE INDEXES ON MATERIALIZED VIEW
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

-- Trigram index for item name partial matching
CREATE INDEX idx_mv_expense_list_item_names ON mv_expense_list USING GIN (item_names_text gin_trgm_ops);
