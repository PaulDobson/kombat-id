-- Migration: 002_role_age_category_master_lineage
-- Description: Adds `role` and `age_category` columns to `practitioners`,
--              and creates the `master_lineage` table with RLS policies.
-- Requirements: 9.1, 9.2, 9.4

-- ============================================================
-- ALTER TABLE practitioners
-- ============================================================

-- Req 9.1 — Rol jerárquico del practicante
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'alumno'
    CHECK (role IN ('alumno', 'instructor', 'profesor', 'maestro'));

-- Req 9.2 — Categoría de edad derivada de birth_date (columna generada STORED)
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS age_category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN EXTRACT(YEAR FROM AGE(birth_date)) <= 11 THEN 'infantil'
      WHEN EXTRACT(YEAR FROM AGE(birth_date)) <= 17 THEN 'juvenil'
      WHEN EXTRACT(YEAR FROM AGE(birth_date)) <= 39 THEN 'adulto'
      ELSE 'senior'
    END
  ) STORED;

-- ============================================================
-- TABLE: master_lineage
-- ============================================================

-- Req 9.4, 9.6 — Línea de maestros certificadores por practicante
CREATE TABLE IF NOT EXISTS master_lineage (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id      UUID NOT NULL REFERENCES practitioners(id),
  certifying_master_id UUID NOT NULL REFERENCES practitioners(id),
  grade                TEXT NOT NULL CHECK (grade IN ('white', 'yellow', 'green', 'blue', 'red', 'black')),
  dan                  SMALLINT CHECK (dan BETWEEN 1 AND 9),
  certification_id     UUID NOT NULL REFERENCES certifications(id),
  certified_at         DATE NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY: master_lineage
-- ============================================================

ALTER TABLE master_lineage ENABLE ROW LEVEL SECURITY;

-- Practicante puede leer su propia línea de maestros
CREATE POLICY "practitioner_read_own_lineage"
  ON master_lineage FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Admin puede realizar todas las operaciones
CREATE POLICY "admin_all_lineage"
  ON master_lineage FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
