ALTER TABLE submissions ADD COLUMN IF NOT EXISTS service_type VARCHAR(50);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS buyback_interest BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS action VARCHAR(100);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'submissions_service_type_check'
      AND conrelid = 'submissions'::regclass
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_service_type_check
      CHECK (service_type IS NULL OR service_type IN ('recycle', 'donate', 'upcycle', 'buyback'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'submissions_quantity_check'
      AND conrelid = 'submissions'::regclass
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_quantity_check
      CHECK (quantity IS NULL OR quantity > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS submission_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID UNIQUE NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  item_types TEXT,
  other_item_type TEXT,
  condition TEXT,
  cleanliness TEXT,
  knows_fabric_type BOOLEAN,
  fabric_types TEXT,
  custom_fabric_text TEXT,
  fabric_identification TEXT,
  brand TEXT,
  no_brand_visible BOOLEAN DEFAULT false,
  fabric_description TEXT,
  restricted_category TEXT DEFAULT 'none',
  fiber_composition TEXT,
  wearability TEXT,
  repairability TEXT,
  contamination_level TEXT,
  damage_classification TEXT,
  repurposing_potential TEXT,
  trim_removal TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS burn_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  performed BOOLEAN DEFAULT false,
  page INTEGER,
  moment TEXT,
  flames TEXT,
  no_flame TEXT,
  smell TEXT,
  ashes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT,
  metadata JSONB,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_details_submission_id ON submission_details(submission_id);
CREATE INDEX IF NOT EXISTS idx_burn_tests_submission_id ON burn_tests(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_images_submission_id ON submission_images(submission_id);
