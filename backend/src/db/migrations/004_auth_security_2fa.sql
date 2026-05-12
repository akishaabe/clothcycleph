ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_confirmed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

CREATE TABLE IF NOT EXISTS user_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_user_id ON user_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_unused ON user_recovery_codes(user_id, used_at);

CREATE TABLE IF NOT EXISTS auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events(created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);
