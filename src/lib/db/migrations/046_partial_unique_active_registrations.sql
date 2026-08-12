-- Migration 046: Partial Unique Constraint for Active Event Registrations
-- Allows re-enrollment of students with cancelled registrations

-- Drop the existing full unique constraint
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_unique_active;

-- Create a partial unique index that only applies to non-cancelled registrations
-- This allows a practitioner to have multiple registrations for the same event
-- as long as only one is active (not cancelled)
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_unique_active
  ON event_registrations (event_id, practitioner_id)
  WHERE status != 'cancelada';

-- Comment explaining the constraint
COMMENT ON INDEX event_registrations_unique_active IS 
  'Ensures a practitioner can only have one active (non-cancelled) registration per event. Cancelled registrations are excluded to allow re-enrollment.';
