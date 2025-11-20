-- V1.1.0: Switch to Keycloak-based authentication
-- - Removes local password storage
-- - Adds keycloak_sub for mapping to Keycloak subject

BEGIN;

-- Add new column for Keycloak subject (nullable initially for safe migration)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS keycloak_sub VARCHAR(255);

-- Create unique index on keycloak_sub (allows multiple NULLs by default in Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_keycloak_sub_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_users_keycloak_sub_unique ON users(keycloak_sub);
  END IF;
END$$;

-- Drop legacy password storage column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='password_hash'
  ) THEN
    ALTER TABLE users DROP COLUMN password_hash;
  END IF;
END$$;

COMMIT;
