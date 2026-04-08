-- Migration: 027_certification_requests
-- Description: Creates the certification_requests table for instructor-initiated
--              certification requests that require admin approval.

CREATE TABLE IF NOT EXISTS certification_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id      UUID        NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  practitioner_id   UUID        NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  cert_type         TEXT        NOT NULL,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin listing (pending requests ordered by date)
CREATE INDEX IF NOT EXISTS idx_certification_requests_status_created
  ON certification_requests (status, created_at DESC);

-- Index for instructor querying their own requests
CREATE INDEX IF NOT EXISTS idx_certification_requests_requester
  ON certification_requests (requester_id);
