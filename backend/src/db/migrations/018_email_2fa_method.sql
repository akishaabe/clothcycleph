ALTER TABLE users DROP CONSTRAINT IF EXISTS users_two_factor_method_check;

ALTER TABLE users
  ADD CONSTRAINT users_two_factor_method_check
  CHECK (two_factor_method IN ('email', 'totp', 'sms'));
