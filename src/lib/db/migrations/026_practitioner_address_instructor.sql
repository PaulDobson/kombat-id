-- Migration: 026_practitioner_address_instructor
-- Description: Adds address fields and instructor reference to practitioners table

ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS address_street  TEXT,
  ADD COLUMN IF NOT EXISTS address_city    TEXT,
  ADD COLUMN IF NOT EXISTS address_region  TEXT,
  ADD COLUMN IF NOT EXISTS instructor_id   UUID REFERENCES practitioners(id) ON DELETE SET NULL;
