-- Migration: 025_discipline_grades
-- Description: Creates the discipline_grades table with RLS policies and
--              a partial unique index to enforce one active grade per
--              practitioner per discipline.
-- Requirements: 13.1, 13.3
-- Tasks: 25.2

-- ============================================================
-- TABLE: discipline_grades
-- ============================================================

CREATE TABLE discipline_grades (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id       UUID NOT NULL REFERENCES practitioners(id),
  discipline            TEXT NOT NULL CHECK (discipline IN ('kombat_taekwondo', 'taekwondo_wtf', 'hapkido', 'kick_boxing', 'defensa_personal')),
  grade                 TEXT NOT NULL CHECK (grade IN ('white', 'yellow', 'green', 'blue', 'red', 'black')),
  dan                   SMALLINT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  obtained_at           DATE NOT NULL,
  certifying_master_id  UUID REFERENCES practitioners(id),
  certification_id      UUID REFERENCES certifications(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- UNIQUENESS CONSTRAINT (Req 13.3)
-- Only one active grade per practitioner per discipline.
-- A partial unique index covers only rows where is_active = true,
-- allowing multiple inactive (historical) records for the same
-- practitioner + discipline combination.
-- ============================================================

CREATE UNIQUE INDEX discipline_grades_active_unique
  ON discipline_grades (practitioner_id, discipline)
  WHERE is_active = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE discipline_grades ENABLE ROW LEVEL SECURITY;

-- Req 13.6 — Practitioners can read their own discipline grades
CREATE POLICY "practitioner_read_own_discipline_grades" ON discipline_grades
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can read all discipline grades
CREATE POLICY "admin_read_all_discipline_grades" ON discipline_grades
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can insert discipline grades (Req 13.1, 13.4)
CREATE POLICY "admin_insert_discipline_grades" ON discipline_grades
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can update discipline grades (Req 13.4 — deactivate previous grade)
CREATE POLICY "admin_update_discipline_grades" ON discipline_grades
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
