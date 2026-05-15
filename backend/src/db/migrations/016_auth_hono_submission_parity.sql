ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(20) DEFAULT 'totp';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_two_factor_method_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_two_factor_method_check
      CHECK (two_factor_method IN ('totp', 'sms'));
  END IF;
END $$;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_name VARCHAR(160);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS upcycle_request TEXT;

ALTER TABLE submission_images ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE submission_images ADD COLUMN IF NOT EXISTS metadata JSONB;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'transactions'::regclass
    AND pg_get_constraintdef(oid) LIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE transactions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'in_progress', 'rejected'));
