ALTER TABLE partner_rule_change_requests
  DROP CONSTRAINT IF EXISTS partner_rule_change_requests_status_check;

ALTER TABLE partner_rule_change_requests
  ADD CONSTRAINT partner_rule_change_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'approved', 'declined', 'needs_more_information', 'implemented'));

ALTER TABLE partner_rule_change_requests
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE partner_rule_change_requests
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
