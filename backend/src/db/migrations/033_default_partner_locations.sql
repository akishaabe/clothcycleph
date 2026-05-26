UPDATE partners
SET
  address = 'Mapúa Makati',
  updated_at = CURRENT_TIMESTAMP
WHERE address IS NULL
   OR btrim(address) = '';

UPDATE users
SET
  address = 'Mapúa Makati',
  updated_at = CURRENT_TIMESTAMP
WHERE lower(role) = 'partner'
  AND (address IS NULL OR btrim(address) = '');
