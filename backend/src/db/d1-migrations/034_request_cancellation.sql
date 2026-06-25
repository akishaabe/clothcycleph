ALTER TABLE transactions ADD COLUMN cancellation_reason TEXT;
ALTER TABLE transactions ADD COLUMN cancelled_at TEXT;

PRAGMA foreign_keys = OFF;

CREATE TABLE transactions_new (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('recycle', 'donate', 'upcycle', 'buyback')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'cancelled')),
  amount REAL,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TEXT,
  bag_color TEXT,
  estimated_distance_km REAL,
  estimated_carbon_kg REAL,
  outcome_title TEXT,
  outcome_description TEXT,
  outcome_photos TEXT DEFAULT '[]',
  outcome_reported_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO transactions_new (
  id, submission_id, from_user_id, to_partner_id, type, status, amount, notes,
  cancellation_reason, cancelled_at, bag_color, estimated_distance_km,
  estimated_carbon_kg, outcome_title, outcome_description, outcome_photos,
  outcome_reported_at, created_at, updated_at
)
SELECT
  id, submission_id, from_user_id, to_partner_id, type, status, amount, notes,
  cancellation_reason, cancelled_at, bag_color, estimated_distance_km,
  estimated_carbon_kg, outcome_title, outcome_description, outcome_photos,
  outcome_reported_at, created_at, updated_at
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX IF NOT EXISTS idx_transactions_submission_id ON transactions(submission_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user_id ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_partner_id ON transactions(to_partner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

PRAGMA foreign_keys = ON;
