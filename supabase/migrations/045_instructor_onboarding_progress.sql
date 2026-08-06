-- Migration: 045_instructor_onboarding_progress.sql
-- Creates the instructor_onboarding_progress table with RLS policies.
-- Each instructor (practitioner) has at most one progress record (UNIQUE on practitioner_id).

CREATE TABLE instructor_onboarding_progress (
  id                               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id                  UUID        NOT NULL UNIQUE REFERENCES practitioners(id) ON DELETE CASCADE,
  step_create_academy_completed    BOOLEAN     NOT NULL DEFAULT false,
  step_register_students_completed BOOLEAN     NOT NULL DEFAULT false,
  step_welcome_emails_completed    BOOLEAN     NOT NULL DEFAULT false,
  step_events_info_completed       BOOLEAN     NOT NULL DEFAULT false,
  completed_at                     TIMESTAMPTZ,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE instructor_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Instructors can only read their own record
CREATE POLICY "instructor_read_own_onboarding_progress"
  ON instructor_onboarding_progress
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Instructors can only update their own record
CREATE POLICY "instructor_update_own_onboarding_progress"
  ON instructor_onboarding_progress
  FOR UPDATE
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Service role can insert (used by the server-side auto-init path)
CREATE POLICY "service_role_insert_onboarding_progress"
  ON instructor_onboarding_progress
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
