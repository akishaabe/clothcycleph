CREATE TABLE IF NOT EXISTS dss_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key VARCHAR(160) UNIQUE NOT NULL,
  pathway VARCHAR(50) CHECK (pathway IS NULL OR pathway IN ('recycle', 'donate', 'upcycle', 'buyback', 'rejected')),
  category VARCHAR(120),
  question_key VARCHAR(160),
  expected_values JSONB,
  weight DECIMAL(8,4) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  description TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dss_rules_pathway ON dss_rules(pathway);
CREATE INDEX IF NOT EXISTS idx_dss_rules_active ON dss_rules(active);
