ALTER TABLE users ALTER COLUMN two_factor_enabled SET DEFAULT true;
ALTER TABLE users ALTER COLUMN two_factor_method SET DEFAULT 'email';

UPDATE users
SET two_factor_enabled = true
WHERE two_factor_enabled IS DISTINCT FROM true;

UPDATE users
SET two_factor_method = 'email'
WHERE two_factor_method IS NULL;
