ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_user_id_unique
  ON partners(user_id)
  WHERE user_id IS NOT NULL;
