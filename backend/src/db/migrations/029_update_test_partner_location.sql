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
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Test Partner',
  'Test partner location for DSS and GIS distance checks.',
  'test-partner@clothcycleph.local',
  NULL,
  'Metropolitan Avenue cor Zapote Street, Makati, Metro Manila',
  'recycle, donate, upcycle',
  'recycle, donate, upcycle',
  'active',
  true,
  0,
  14.5659,
  121.0146
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  description = COALESCE(partners.description, EXCLUDED.description),
  address = EXCLUDED.address,
  service_types = COALESCE(partners.service_types, EXCLUDED.service_types),
  accepted_service_types = COALESCE(partners.accepted_service_types, EXCLUDED.accepted_service_types),
  status = CASE WHEN partners.status = 'rejected' THEN partners.status ELSE EXCLUDED.status END,
  verified = CASE WHEN partners.verified IS NULL THEN EXCLUDED.verified ELSE partners.verified END,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();

UPDATE partners
SET
  address = 'Metropolitan Avenue cor Zapote Street, Makati, Metro Manila',
  latitude = 14.5659,
  longitude = 121.0146,
  updated_at = NOW()
WHERE lower(name) = 'test partner';
