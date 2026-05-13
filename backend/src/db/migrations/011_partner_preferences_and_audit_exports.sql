ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS capacity_notes TEXT,
  ADD COLUMN IF NOT EXISTS accepted_service_types TEXT,
  ADD COLUMN IF NOT EXISTS accepts_clean_only BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_areas TEXT,
  ADD COLUMN IF NOT EXISTS rule_change_requires_admin BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_partners_accepted_service_types
  ON partners USING gin (to_tsvector('simple', COALESCE(accepted_service_types, service_types, '')));

ALTER TABLE recommendation_runs
  ADD COLUMN IF NOT EXISTS audit_label TEXT DEFAULT 'DSS audit trail';
