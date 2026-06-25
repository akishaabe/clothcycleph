ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'cancelled'));
