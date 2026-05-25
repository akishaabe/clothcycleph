CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  original_name TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  purpose TEXT DEFAULT 'general',
  related_entity_type TEXT,
  related_entity_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_storage_key ON uploaded_files(storage_key);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_url ON uploaded_files(url);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_related_entity
  ON uploaded_files(related_entity_type, related_entity_id);
