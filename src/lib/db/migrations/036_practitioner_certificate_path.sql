-- Migración 036: Agrega columna certificate_path a practitioners
-- Almacena la ruta en Supabase Storage del certificado PDF de membresía generado.

ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS certificate_path TEXT DEFAULT NULL;
