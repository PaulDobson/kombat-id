-- Migration 033: Referee Registration System
-- Creates referee_registrations and referee_portal_publications tables

-- 1. Create referee_registrations table
CREATE TABLE IF NOT EXISTS referee_registrations (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     TEXT        NOT NULL,
  full_name                 TEXT        NOT NULL,
  country                   TEXT        NOT NULL,
  registration_number       TEXT        NOT NULL,
  certificate_path          TEXT,
  status                    TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  auth_user_id              UUID,
  approved_at               TIMESTAMPTZ,
  approved_by               UUID,
  rejected_at               TIMESTAMPTZ,
  rejected_by               UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT referee_registrations_email_unique UNIQUE (email),
  CONSTRAINT referee_registrations_registration_number_unique UNIQUE (registration_number)
);

-- Indexes for referee_registrations
CREATE INDEX IF NOT EXISTS idx_referee_registrations_email
  ON referee_registrations(email);

CREATE INDEX IF NOT EXISTS idx_referee_registrations_status
  ON referee_registrations(status);

CREATE INDEX IF NOT EXISTS idx_referee_registrations_created_at
  ON referee_registrations(created_at DESC);

-- 2. Create referee_portal_publications table
CREATE TABLE IF NOT EXISTS referee_portal_publications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL CHECK (char_length(title) <= 300),
  body          TEXT        NOT NULL,
  category      TEXT        NOT NULL
                CHECK (category IN ('news', 'regulation', 'championship')),
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for referee_portal_publications
CREATE INDEX IF NOT EXISTS idx_referee_portal_publications_category
  ON referee_portal_publications(category);

CREATE INDEX IF NOT EXISTS idx_referee_portal_publications_published_at
  ON referee_portal_publications(published_at DESC);
