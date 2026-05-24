CREATE TABLE IF NOT EXISTS partner_rule_change_request_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES partner_rule_change_requests(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_role VARCHAR(50) NOT NULL CHECK (author_role IN ('partner', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_rule_change_request_replies_request_id
  ON partner_rule_change_request_replies(request_id);

CREATE INDEX IF NOT EXISTS idx_partner_rule_change_request_replies_created_at
  ON partner_rule_change_request_replies(created_at DESC);
