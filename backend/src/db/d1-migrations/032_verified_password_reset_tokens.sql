ALTER TABLE password_reset_tokens ADD COLUMN verified_at TEXT;
ALTER TABLE password_reset_tokens ADD COLUMN reset_token_hash TEXT;
ALTER TABLE password_reset_tokens ADD COLUMN reset_token_expires_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_reset_token_hash
  ON password_reset_tokens(reset_token_hash)
  WHERE reset_token_hash IS NOT NULL;
