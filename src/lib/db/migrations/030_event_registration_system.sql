-- Migration 030: Event Registration System
-- Extends martial_events with description, registration_fee, min/max participants
-- Creates event_registrations table

-- 1. Extend martial_events with new fields
ALTER TABLE martial_events
  ADD COLUMN IF NOT EXISTS description        TEXT          CHECK (char_length(description) <= 5000),
  ADD COLUMN IF NOT EXISTS registration_fee   NUMERIC(10,2) CHECK (registration_fee IS NULL OR registration_fee >= 0),
  ADD COLUMN IF NOT EXISTS min_participants   INTEGER       CHECK (min_participants IS NULL OR min_participants >= 1),
  ADD COLUMN IF NOT EXISTS max_participants   INTEGER       CHECK (max_participants IS NULL OR max_participants >= 1);

-- Constraint: max >= min when both are defined
ALTER TABLE martial_events
  ADD CONSTRAINT martial_events_participants_check
    CHECK (
      min_participants IS NULL
      OR max_participants IS NULL
      OR max_participants >= min_participants
    );

-- 2. Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES martial_events(id) ON DELETE CASCADE,
  practitioner_id UUID        NOT NULL REFERENCES practitioners(id),
  instructor_id   UUID        NOT NULL REFERENCES practitioners(id),
  status          TEXT        NOT NULL DEFAULT 'pendiente_pago'
                              CHECK (status IN ('pendiente_pago', 'confirmada', 'cancelada')),
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at    TIMESTAMPTZ,
  confirmed_by    UUID,
  cancelled_at    TIMESTAMPTZ,
  cancelled_by    UUID,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A practitioner can only have one active registration per event
  CONSTRAINT event_registrations_unique_active
    UNIQUE (event_id, practitioner_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id
  ON event_registrations(event_id);

CREATE INDEX IF NOT EXISTS idx_event_registrations_practitioner_id
  ON event_registrations(practitioner_id);

CREATE INDEX IF NOT EXISTS idx_event_registrations_instructor_id
  ON event_registrations(instructor_id);
