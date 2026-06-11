-- Migration: 043_performance_indexes.sql
-- Performance indexes for high-traffic queries at scale (300K monthly users).
-- Must be applied to the Supabase database via the SQL editor or supabase db push.

-- ─── Enable pg_trgm for trigram-based ILIKE search ───────────────────────────
-- Required for GIN trigram indexes on text columns searched with ILIKE '%term%'.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── practitioners ────────────────────────────────────────────────────────────

-- Full-text search on full_name used in instructor student search and admin search.
-- Without this index, ILIKE '%name%' performs a sequential table scan.
CREATE INDEX IF NOT EXISTS idx_practitioners_full_name_trgm
  ON practitioners USING GIN (full_name gin_trgm_ops);

-- Lookup by auth_user_id — called on every authenticated page load via DashboardNav.
-- This is the hottest query in the system.
CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioners_auth_user_id
  ON practitioners (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Lookup by qr_token for public verification endpoint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioners_qr_token
  ON practitioners (qr_token);

-- Lookup by instructor_id for "direct students" queries on instructor dashboard.
CREATE INDEX IF NOT EXISTS idx_practitioners_instructor_id
  ON practitioners (instructor_id)
  WHERE instructor_id IS NOT NULL;

-- Composite index for active practitioners by grade — used in ranking queries.
CREATE INDEX IF NOT EXISTS idx_practitioners_grade_active
  ON practitioners (grade, is_active);

-- ─── martial_history ──────────────────────────────────────────────────────────

-- Primary access pattern: fetch history for a practitioner ordered by date.
CREATE INDEX IF NOT EXISTS idx_martial_history_practitioner_date
  ON martial_history (practitioner_id, event_date DESC);

-- ─── certifications ───────────────────────────────────────────────────────────

-- Fetch active certifications by practitioner.
CREATE INDEX IF NOT EXISTS idx_certifications_practitioner_active
  ON certifications (practitioner_id, is_revoked);

-- ─── academy_memberships ─────────────────────────────────────────────────────

-- Batch count of active members per academy — replaces N+1 pattern.
CREATE INDEX IF NOT EXISTS idx_academy_memberships_academy_active
  ON academy_memberships (academy_id, is_active);

-- Lookup memberships by practitioner_id (used in instructor dashboard joins).
CREATE INDEX IF NOT EXISTS idx_academy_memberships_practitioner
  ON academy_memberships (practitioner_id);

-- ─── martial_events ───────────────────────────────────────────────────────────

-- Upcoming events query on landing page, instructor events page, and dashboards.
-- No partial index here — CURRENT_DATE is volatile and not allowed in index predicates.
-- A plain index on event_date is sufficient; the planner filters by date at query time.
CREATE INDEX IF NOT EXISTS idx_martial_events_date_asc
  ON martial_events (event_date ASC);

-- ─── grade_exams ──────────────────────────────────────────────────────────────

-- Already indexed by 029 migration on (status), (instructor_id), (practitioner_id).
-- Adding composite index for the instructor dashboard "recent exams" query.
CREATE INDEX IF NOT EXISTS idx_grade_exams_instructor_date
  ON grade_exams (instructor_id, exam_date DESC);

-- ─── ranking_positions ───────────────────────────────────────────────────────

-- Lookup ranking by practitioner_id — used on dashboard and ranking page.
CREATE INDEX IF NOT EXISTS idx_ranking_positions_practitioner_id
  ON ranking_positions (practitioner_id);

-- ─── event_registrations ─────────────────────────────────────────────────────

-- Check for existing registration by (practitioner, event) — used before every enrollment.
-- The unique constraint from migration 030 covers this, but an explicit index helps.
-- (Already covered by UNIQUE constraint, included here for documentation only.)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_unique_active
--   ON event_registrations (event_id, practitioner_id);
