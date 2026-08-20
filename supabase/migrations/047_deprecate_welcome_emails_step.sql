-- Migration 047: Deprecate welcome emails onboarding step
-- The step_welcome_emails_completed column is retained in the table to avoid a
-- destructive schema change, but it is no longer part of the active onboarding
-- flow. All existing records (and all new records via the updated server code)
-- will have this column set to true so it never blocks onboarding completion.

UPDATE instructor_onboarding_progress
SET
  step_welcome_emails_completed = true,
  updated_at = now()
WHERE step_welcome_emails_completed = false;

-- New records are inserted with step_welcome_emails_completed = true by the
-- application layer (see SupabaseOnboardingProgressRepository.create).
