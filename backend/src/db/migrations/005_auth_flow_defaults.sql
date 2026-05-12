ALTER TABLE users ALTER COLUMN two_factor_enabled SET DEFAULT false;

UPDATE users
SET two_factor_enabled = false
WHERE two_factor_confirmed_at IS NULL;

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, NOW())
WHERE email_verified_at IS NULL;
