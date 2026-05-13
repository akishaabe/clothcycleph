ALTER TABLE partners ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

ALTER TABLE partners ADD CONSTRAINT chk_partners_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE partners ADD CONSTRAINT chk_partners_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
