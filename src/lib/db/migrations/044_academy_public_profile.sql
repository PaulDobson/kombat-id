-- Migration: 044_academy_public_profile.sql
-- Adds public profile fields to the academies table.
-- These fields are shown on the public landing page for each academy (/academies/[id]).
-- Editable by admins from the admin panel.

ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS description       TEXT CHECK (char_length(description) <= 3000),
  ADD COLUMN IF NOT EXISTS founder_story     TEXT CHECK (char_length(founder_story) <= 3000),
  ADD COLUMN IF NOT EXISTS contact_phone     TEXT,
  ADD COLUMN IF NOT EXISTS contact_email     TEXT,
  ADD COLUMN IF NOT EXISTS contact_instagram TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp  TEXT,
  ADD COLUMN IF NOT EXISTS contact_website   TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_path  TEXT;

-- Index for the public page lookup by id (already has a PK index, but explicit for clarity)
-- No extra index needed — id is already the primary key.

COMMENT ON COLUMN academies.description       IS 'Descripción pública de la academia (máx 3000 caracteres)';
COMMENT ON COLUMN academies.founder_story     IS 'Historia del fundador / reseña de los orígenes de la academia';
COMMENT ON COLUMN academies.contact_phone     IS 'Teléfono de contacto público';
COMMENT ON COLUMN academies.contact_email     IS 'Email de contacto público';
COMMENT ON COLUMN academies.contact_instagram IS 'Usuario de Instagram (sin @)';
COMMENT ON COLUMN academies.contact_whatsapp  IS 'Número de WhatsApp (formato internacional, ej: 56912345678)';
COMMENT ON COLUMN academies.contact_website   IS 'URL del sitio web';
COMMENT ON COLUMN academies.cover_image_path  IS 'Path en el bucket academy-covers de Supabase Storage';
