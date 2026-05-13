ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_name VARCHAR(160);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS upcycle_request TEXT;
