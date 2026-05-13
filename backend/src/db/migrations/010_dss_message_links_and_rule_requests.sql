ALTER TABLE messages ADD COLUMN IF NOT EXISTS related_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS partner_rule_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rule_area VARCHAR(100) NOT NULL,
  requested_change TEXT NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_related_transaction_id ON messages(related_transaction_id);
CREATE INDEX IF NOT EXISTS idx_partner_rule_change_requests_partner_id ON partner_rule_change_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_rule_change_requests_status ON partner_rule_change_requests(status);
