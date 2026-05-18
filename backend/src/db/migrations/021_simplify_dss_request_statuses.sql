UPDATE transactions SET status = 'accepted' WHERE status = 'in_progress';
UPDATE transactions SET status = 'rejected' WHERE status = 'declined';

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'accepted', 'completed', 'rejected'));
