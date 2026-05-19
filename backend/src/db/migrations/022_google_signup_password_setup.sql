ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_setup_required BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET password_setup_required = FALSE
WHERE password_setup_required IS NULL;
