-- V3.1.2__backfill_tax_amounts.sql
-- Backfill GST/PST amounts for existing rows where applicability flags are set
-- but gst_amount/pst_amount were left at 0.
--
-- Uses user-specific tax_defaults if present, otherwise falls back to the system default.


WITH system_default AS (
  SELECT gst_rate, pst_rate
  FROM tax_defaults
  WHERE is_default = true
    AND region IS NULL
    AND user_id IS NULL
  LIMIT 1
),
expense_rates AS (
  SELECT
    e.id AS expense_id,
    COALESCE(ud.gst_rate, sd.gst_rate) AS gst_rate,
    COALESCE(ud.pst_rate, sd.pst_rate) AS pst_rate
  FROM expenses e
  CROSS JOIN system_default sd
  LEFT JOIN LATERAL (
    SELECT td.gst_rate, td.pst_rate
    FROM tax_defaults td
    WHERE td.user_id = e.user_id
    ORDER BY td.created_at DESC
    LIMIT 1
  ) ud ON true
  WHERE e.deleted_at IS NULL
)
UPDATE expenses e
SET
  gst_amount = CASE
    WHEN e.gst_applicable = true AND (e.gst_amount IS NULL OR e.gst_amount = 0)
      THEN ROUND(e.amount * (er.gst_rate / 100.0), 2)
    ELSE e.gst_amount
  END,
  pst_amount = CASE
    WHEN e.pst_applicable = true AND (e.pst_amount IS NULL OR e.pst_amount = 0)
      THEN ROUND(e.amount * (er.pst_rate / 100.0), 2)
    ELSE e.pst_amount
  END
FROM expense_rates er
WHERE e.id = er.expense_id
  AND (
    (e.gst_applicable = true AND (e.gst_amount IS NULL OR e.gst_amount = 0))
    OR (e.pst_applicable = true AND (e.pst_amount IS NULL OR e.pst_amount = 0))
  );


WITH system_default AS (
  SELECT gst_rate, pst_rate
  FROM tax_defaults
  WHERE is_default = true
    AND region IS NULL
    AND user_id IS NULL
  LIMIT 1
),
item_rates AS (
  SELECT
    ei.id AS item_id,
    COALESCE(ud.gst_rate, sd.gst_rate) AS gst_rate,
    COALESCE(ud.pst_rate, sd.pst_rate) AS pst_rate
  FROM expense_items ei
  JOIN expenses e ON e.id = ei.expense_id
  CROSS JOIN system_default sd
  LEFT JOIN LATERAL (
    SELECT td.gst_rate, td.pst_rate
    FROM tax_defaults td
    WHERE td.user_id = e.user_id
    ORDER BY td.created_at DESC
    LIMIT 1
  ) ud ON true
  WHERE ei.deleted_at IS NULL
    AND e.deleted_at IS NULL
)
UPDATE expense_items ei
SET
  gst_amount = CASE
    WHEN ei.gst_applicable = true AND (ei.gst_amount IS NULL OR ei.gst_amount = 0)
      THEN ROUND(ei.amount * (ir.gst_rate / 100.0), 2)
    ELSE ei.gst_amount
  END,
  pst_amount = CASE
    WHEN ei.pst_applicable = true AND (ei.pst_amount IS NULL OR ei.pst_amount = 0)
      THEN ROUND(ei.amount * (ir.pst_rate / 100.0), 2)
    ELSE ei.pst_amount
  END
FROM item_rates ir
WHERE ei.id = ir.item_id
  AND (
    (ei.gst_applicable = true AND (ei.gst_amount IS NULL OR ei.gst_amount = 0))
    OR (ei.pst_applicable = true AND (ei.pst_amount IS NULL OR ei.pst_amount = 0))
  );

-- ============================================================================
-- 3. Refresh MV so totals reflect backfilled amounts
-- ============================================================================

REFRESH MATERIALIZED VIEW mv_expense_list;
