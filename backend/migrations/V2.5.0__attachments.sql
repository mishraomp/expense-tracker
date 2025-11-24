-- Migration: Attachments & BulkImportJob & UserDriveAuth
-- Version: V2.5.0

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id text UNIQUE NOT NULL,
  linked_expense_id uuid NULL,
  linked_income_id uuid NULL,
  mime_type varchar(150) NOT NULL,
  size_bytes int NOT NULL CHECK (size_bytes <= 5242880),
  original_filename varchar(255) NOT NULL,
  checksum varchar(128) NOT NULL,
  web_view_link varchar(500) NOT NULL,
  uploaded_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  replaced_by_attachment_id uuid NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  retention_expires_at timestamptz NULL,
  drive_record_type varchar(20) NOT NULL,
  drive_record_date date NOT NULL,
  drive_amount_minor_units bigint NOT NULL,
  drive_category_id uuid NULL,
  CONSTRAINT chk_linked_one CHECK (
    (linked_expense_id IS NOT NULL AND linked_income_id IS NULL) OR
    (linked_expense_id IS NULL AND linked_income_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_attachments_expense ON attachments(linked_expense_id);
CREATE INDEX IF NOT EXISTS idx_attachments_income ON attachments(linked_income_id);
CREATE INDEX IF NOT EXISTS idx_attachments_status_retention ON attachments(status, retention_expires_at);
CREATE INDEX IF NOT EXISTS idx_attachments_drive_props ON attachments(drive_record_type, drive_record_date, drive_category_id);

CREATE TABLE IF NOT EXISTS bulk_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by_user_id uuid NOT NULL,
  total_files int NOT NULL,
  uploaded_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  duplicate_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL,
  started_at timestamptz NULL,
  finished_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_bulk_job_user_status ON bulk_import_jobs(initiated_by_user_id, status);

CREATE TABLE IF NOT EXISTS user_drive_auth (
  user_id uuid PRIMARY KEY,
  encrypted_refresh_token varchar(500) NOT NULL,
  scopes text[] NOT NULL,
  last_validated_at timestamptz NOT NULL DEFAULT now()
);
