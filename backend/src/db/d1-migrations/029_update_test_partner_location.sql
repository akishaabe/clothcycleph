UPDATE partners
SET
  address = 'Metropolitan Avenue cor Zapote Street, Makati, Metro Manila',
  latitude = 14.5659,
  longitude = 121.0146,
  updated_at = CURRENT_TIMESTAMP
WHERE lower(name) = 'test partner'
   OR lower(email) = 'test-partner@clothcycleph.local';

INSERT INTO partners (
  id,
  name,
  description,
  email,
  phone,
  address,
  service_types,
  accepted_service_types,
  status,
  verified,
  rating,
  latitude,
  longitude
)
SELECT
  '11111111-1111-4111-8111-111111111111',
  'Test Partner',
  'Test partner location for DSS and GIS distance checks.',
  'test-partner@clothcycleph.local',
  NULL,
  'Metropolitan Avenue cor Zapote Street, Makati, Metro Manila',
  'recycle, donate, upcycle',
  'recycle, donate, upcycle',
  'active',
  1,
  0,
  14.5659,
  121.0146
WHERE NOT EXISTS (
  SELECT 1
  FROM partners
  WHERE lower(name) = 'test partner'
     OR lower(email) = 'test-partner@clothcycleph.local'
);
