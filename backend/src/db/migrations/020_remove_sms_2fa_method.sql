ALTER TABLE users DROP CONSTRAINT IF EXISTS users_two_factor_method_check;

UPDATE users
SET two_factor_method = 'email',
    two_factor_secret_encrypted = NULL,
    two_factor_confirmed_at = NOW(),
    two_factor_code_hash = NULL,
    two_factor_code_expires_at = NULL
WHERE two_factor_method = 'sms';

ALTER TABLE users
  ADD CONSTRAINT users_two_factor_method_check
  CHECK (two_factor_method IN ('email', 'totp'));
