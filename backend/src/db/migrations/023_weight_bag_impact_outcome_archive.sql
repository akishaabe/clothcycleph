CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS weight_value DECIMAL(10,3);
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'kg';

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bag_color VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS estimated_distance_km DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS estimated_carbon_kg DECIMAL(10,3);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS outcome_title TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS outcome_description TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS outcome_reported_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  snapshot JSONB,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_entity ON deleted_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_deleted_at ON deleted_records(deleted_at DESC);
