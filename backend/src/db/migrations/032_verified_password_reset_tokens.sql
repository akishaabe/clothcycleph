ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_reset_token_hash
  ON password_reset_tokens(reset_token_hash)
  WHERE reset_token_hash IS NOT NULL;
