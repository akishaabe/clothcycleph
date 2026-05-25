CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  original_name TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  purpose VARCHAR(50) NOT NULL DEFAULT 'general',
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_storage_key ON uploaded_files(storage_key);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_url ON uploaded_files(url);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_related_entity
  ON uploaded_files(related_entity_type, related_entity_id);
