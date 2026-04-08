-- Migration: 004_international_ranking
-- Description: Adds event_scope and event_country to martial_history (Req 11.1, 11.6)
--              and international/combined ranking columns to ranking_positions (Req 11.2, 11.3, 11.4)
-- Tasks: 23.2

-- ============================================================
-- martial_history: event scope and country
-- ============================================================

ALTER TABLE martial_history
  ADD COLUMN IF NOT EXISTS event_scope   TEXT CHECK (event_scope IN ('national', 'international')),
  ADD COLUMN IF NOT EXISTS event_country TEXT;

-- Constraint: event_country is required when event_scope = 'international'
ALTER TABLE martial_history
  ADD CONSTRAINT martial_history_international_country_required
  CHECK (
    event_scope <> 'international' OR event_country IS NOT NULL
  );

-- ============================================================
-- ranking_positions: international and combined ranking columns
-- ============================================================

ALTER TABLE ranking_positions
  ADD COLUMN IF NOT EXISTS national_points       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS international_points  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combined_points       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS national_position     INTEGER,
  ADD COLUMN IF NOT EXISTS international_position INTEGER,
  ADD COLUMN IF NOT EXISTS combined_position     INTEGER,
  ADD COLUMN IF NOT EXISTS ranking_type          TEXT NOT NULL DEFAULT 'national'
    CHECK (ranking_type IN ('national', 'international', 'combined'));

-- ============================================================
-- ranking_snapshots: international and combined snapshot columns
-- ============================================================

ALTER TABLE ranking_snapshots
  ADD COLUMN IF NOT EXISTS ranking_type          TEXT NOT NULL DEFAULT 'national'
    CHECK (ranking_type IN ('national', 'international', 'combined')),
  ADD COLUMN IF NOT EXISTS national_points       INTEGER,
  ADD COLUMN IF NOT EXISTS international_points  INTEGER,
  ADD COLUMN IF NOT EXISTS combined_points       INTEGER;

-- ============================================================
-- RLS: allow public read on martial_events (for public /events page)
-- ============================================================

-- Drop the authenticated-only policy and replace with public read
DROP POLICY IF EXISTS "authenticated_read_events" ON martial_events;

CREATE POLICY "public_read_events"
  ON martial_events FOR SELECT
  USING (true);
