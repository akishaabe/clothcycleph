ALTER TABLE transactions ADD COLUMN IF NOT EXISTS outcome_photos JSONB DEFAULT '[]'::jsonb;
