-- Drop legacy password_hash column (no longer used after Auth0 migration)
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
