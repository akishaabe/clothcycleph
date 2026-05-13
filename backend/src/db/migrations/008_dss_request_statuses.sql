DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'transactions'::regclass
    AND pg_get_constraintdef(oid) LIKE '%status%'
    AND pg_get_constraintdef(oid) LIKE '%pending%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE transactions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'in_progress', 'rejected'));

UPDATE transactions SET status = 'accepted' WHERE status = 'in_progress';
UPDATE transactions SET status = 'declined' WHERE status = 'rejected';
