ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS restricted_category TEXT DEFAULT 'none';
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS fiber_composition TEXT;
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS wearability TEXT;
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS repairability TEXT;
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS contamination_level TEXT;
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS damage_classification TEXT;
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS repurposing_potential TEXT;
ALTER TABLE submission_details ADD COLUMN IF NOT EXISTS trim_removal TEXT;
