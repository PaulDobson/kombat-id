-- Migration: 024_charges
-- Description: Creates the charges table with RLS policies for the
--              Sistema Económico module.
-- Requirements: 12.1, 12.2, 12.3
-- Tasks: 24.2

-- ============================================================
-- TABLE: charges
-- ============================================================

CREATE TABLE charges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id   UUID NOT NULL REFERENCES practitioners(id),
  charge_type       TEXT NOT NULL CHECK (charge_type IN ('examen_grado', 'membresia_anual', 'licencia_competencia')),
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD')),
  status            TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado', 'vencido', 'exento')),
  due_date          DATE NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  paid_at           TIMESTAMPTZ,
  payment_reference TEXT,
  exemption_reason  TEXT,
  exempted_by       UUID REFERENCES auth.users(id),
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE charges ENABLE ROW LEVEL SECURITY;

-- Req 12.10 — Practicantes pueden leer sus propios cobros
CREATE POLICY "practitioner_read_own_charges" ON charges
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Admins pueden leer todos los cobros
CREATE POLICY "admin_read_all_charges" ON charges
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins pueden insertar cobros (Req 12.3, 12.7, 12.8)
CREATE POLICY "admin_insert_charges" ON charges
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins pueden actualizar cobros (Req 12.7, 12.8)
CREATE POLICY "admin_update_charges" ON charges
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Service role puede actualizar estado (para expireOverdue — Req 12.4)
CREATE POLICY "service_role_update_charges" ON charges
  FOR UPDATE
  USING (auth.role() = 'service_role');
