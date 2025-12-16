-- Flyway Migration: Add GST and PST tax support
-- Version: V3.0.0
-- Description: Creates TaxDefaults table for system-wide tax rates and adds tax-related columns to expenses and expense_items

-- ==========================================
-- 1. Create TaxDefaults table (system and user-specific tax rates)
-- ==========================================

CREATE TABLE tax_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  pst_rate NUMERIC(5,2) NOT NULL DEFAULT 7.00,
  is_default BOOLEAN NOT NULL DEFAULT true,
  region VARCHAR(10) DEFAULT NULL,
  user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Constraint: only one row with is_default=true (system default)
-- Combined constraint ensures is_default=true only when region and user_id are null
ALTER TABLE tax_defaults
  ADD CONSTRAINT chk_one_default CHECK (
    (is_default = false) OR (is_default = true AND region IS NULL AND user_id IS NULL)
  );

-- Unique index: enforce single system default
CREATE UNIQUE INDEX idx_tax_defaults_is_default ON tax_defaults(is_default) WHERE is_default = true;

-- Indexes for lookups
CREATE INDEX idx_tax_defaults_region ON tax_defaults(region) WHERE region IS NOT NULL;
CREATE INDEX idx_tax_defaults_user_id ON tax_defaults(user_id) WHERE user_id IS NOT NULL;

-- Insert initial system defaults (GST 5%, PST 7% for Canada)
INSERT INTO tax_defaults (gst_rate, pst_rate, is_default)
  VALUES (5.00, 7.00, true);

-- ==========================================
-- 2. Extend expenses table with tax columns
-- ==========================================

ALTER TABLE expenses
  ADD COLUMN gst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN pst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add constraints for amount fields (prevent invalid values)
ALTER TABLE expenses
  ADD CONSTRAINT chk_gst_amount_range CHECK (gst_amount >= -999999.99 AND gst_amount <= 999999.99),
  ADD CONSTRAINT chk_pst_amount_range CHECK (pst_amount >= -999999.99 AND pst_amount <= 999999.99);

-- Add indexes for filtering by applicability
CREATE INDEX idx_expenses_gst_applicable ON expenses(gst_applicable);
CREATE INDEX idx_expenses_pst_applicable ON expenses(pst_applicable);

-- Add indexes for reporting/filtering by amount
CREATE INDEX idx_expenses_gst_amount ON expenses(gst_amount) WHERE gst_amount != 0;
CREATE INDEX idx_expenses_pst_amount ON expenses(pst_amount) WHERE pst_amount != 0;

-- ==========================================
-- 3. Extend expense_items table with tax columns
-- ==========================================

ALTER TABLE expense_items
  ADD COLUMN gst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pst_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN pst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add constraints for amount fields
ALTER TABLE expense_items
  ADD CONSTRAINT chk_expense_items_gst_amount_range CHECK (gst_amount >= -999999.99 AND gst_amount <= 999999.99),
  ADD CONSTRAINT chk_expense_items_pst_amount_range CHECK (pst_amount >= -999999.99 AND pst_amount <= 999999.99);

-- Add indexes for filtering by applicability
CREATE INDEX idx_expense_items_gst_applicable ON expense_items(gst_applicable);
CREATE INDEX idx_expense_items_pst_applicable ON expense_items(pst_applicable);

-- Add indexes for reporting
CREATE INDEX idx_expense_items_gst_amount ON expense_items(gst_amount) WHERE gst_amount != 0;
CREATE INDEX idx_expense_items_pst_amount ON expense_items(pst_amount) WHERE pst_amount != 0;

-- ==========================================
-- 4. Composite indexes for common queries
-- ==========================================

-- For filtering expenses by tax applicability
CREATE INDEX idx_expenses_tax_composite ON expenses(gst_applicable, pst_applicable);

-- For filtering line items by tax applicability
CREATE INDEX idx_expense_items_tax_composite ON expense_items(gst_applicable, pst_applicable, expense_id);

-- ==========================================
-- 5. Verification
-- ==========================================

-- Verify TaxDefaults table created with system default
-- SELECT * FROM tax_defaults WHERE is_default = true;
--
-- Expected output:
-- id: UUID
-- gst_rate: 5.00
-- pst_rate: 7.00
-- is_default: true
-- region: NULL
-- user_id: NULL
-- created_at: CURRENT_TIMESTAMP
-- updated_at: CURRENT_TIMESTAMP

-- Verify new columns exist in expenses table
-- \d expenses
--
-- Expected columns:
-- gst_applicable, pst_applicable, gst_amount, pst_amount

-- Verify new columns exist in expense_items table
-- \d expense_items
--
-- Expected columns:
-- gst_applicable, pst_applicable, gst_amount, pst_amount
