-- Migration 034: Referee Portal Publications Enhanced
-- Extends referee_portal_publications with cover image and event fields,
-- and creates referee_event_registrations table.

-- 1. Add new columns to referee_portal_publications
ALTER TABLE referee_portal_publications
  ADD COLUMN IF NOT EXISTS cover_image_path      TEXT,
  ADD COLUMN IF NOT EXISTS is_event              BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_date            DATE,
  ADD COLUMN IF NOT EXISTS event_location        TEXT        CHECK (char_length(event_location) <= 500),
  ADD COLUMN IF NOT EXISTS max_participants      INTEGER     CHECK (max_participants > 0),
  ADD COLUMN IF NOT EXISTS registration_deadline DATE;

-- 2. Constraint: event fields are only valid when is_event = true
ALTER TABLE referee_portal_publications
  ADD CONSTRAINT chk_event_fields_require_is_event
    CHECK (
      is_event = true
      OR (
        event_date IS NULL
        AND event_location IS NULL
        AND max_participants IS NULL
        AND registration_deadline IS NULL
      )
    );

-- 3. Constraint: is_event = true is only valid for category = 'championship'
ALTER TABLE referee_portal_publications
  ADD CONSTRAINT chk_is_event_requires_championship
    CHECK (
      is_event = false
      OR category = 'championship'
    );

-- 4. Create referee_event_registrations table
CREATE TABLE IF NOT EXISTS referee_event_registrations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   UUID        NOT NULL
                   REFERENCES referee_portal_publications(id) ON DELETE CASCADE,
  referee_user_id  UUID        NOT NULL,
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_referee_event_registration
    UNIQUE (publication_id, referee_user_id)
);

-- 5. Indexes for referee_event_registrations
CREATE INDEX IF NOT EXISTS idx_referee_event_registrations_publication
  ON referee_event_registrations(publication_id);

CREATE INDEX IF NOT EXISTS idx_referee_event_registrations_referee
  ON referee_event_registrations(referee_user_id);
