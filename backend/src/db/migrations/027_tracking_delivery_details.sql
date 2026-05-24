ALTER TABLE request_tracking_updates ADD COLUMN IF NOT EXISTS dropoff_scheduled_at TIMESTAMP;
ALTER TABLE request_tracking_updates ADD COLUMN IF NOT EXISTS dropoff_location TEXT;

