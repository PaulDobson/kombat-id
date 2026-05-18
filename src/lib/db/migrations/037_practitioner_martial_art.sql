-- Migración 037: Agregar columna martial_art a la tabla practitioners
-- Registra el arte marcial principal asociado al grado del practicante.
-- Valores esperados: kombat_taekwondo | taekwondo_wtf | hapkido | kick_boxing | defensa_personal

ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS martial_art TEXT DEFAULT NULL;
