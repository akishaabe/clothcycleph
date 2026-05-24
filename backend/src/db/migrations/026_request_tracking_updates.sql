CREATE TABLE IF NOT EXISTS request_tracking_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  request_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  progress_status VARCHAR(50) NOT NULL CHECK (
    progress_status IN ('request_sent', 'scheduled', 'in_transit', 'dropoff_completed', 'completed')
  ),
  fulfillment_method VARCHAR(50) DEFAULT 'drop_off' CHECK (
    fulfillment_method IN ('drop_off', 'shipping', 'pickup', 'other')
  ),
  logistics_company VARCHAR(160),
  tracking_number VARCHAR(160),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_tracking_submission_id ON request_tracking_updates(submission_id);
CREATE INDEX IF NOT EXISTS idx_request_tracking_request_id ON request_tracking_updates(request_id);
CREATE INDEX IF NOT EXISTS idx_request_tracking_user_id ON request_tracking_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_request_tracking_partner_id ON request_tracking_updates(partner_id);
CREATE INDEX IF NOT EXISTS idx_request_tracking_created_at ON request_tracking_updates(created_at DESC);
