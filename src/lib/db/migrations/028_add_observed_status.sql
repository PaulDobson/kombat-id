-- Migration: 028_add_observed_status
-- Description: Extends the certification_requests status CHECK constraint to include
--              'observed' and adds the observation_notes column for admin feedback.

ALTER TABLE certification_requests
  DROP CONSTRAINT IF EXISTS certification_requests_status_check;

ALTER TABLE certification_requests
  ADD CONSTRAINT certification_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'observed'));

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS observation_notes TEXT;
