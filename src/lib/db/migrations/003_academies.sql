-- Migration 003: Red Nacional de Academias
-- Requirements: 10.1, 10.2, 10.3, 10.4, 10.5

-- ============================================================
-- Table: academies
-- ============================================================

CREATE TABLE academies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  region                TEXT NOT NULL CHECK (region IN (
                          'arica_y_parinacota', 'tarapaca', 'antofagasta', 'atacama',
                          'coquimbo', 'valparaiso', 'metropolitana', 'ohiggins',
                          'maule', 'nuble', 'biobio', 'araucania', 'los_rios',
                          'los_lagos', 'aysen', 'magallanes'
                        )),
  city                  TEXT NOT NULL,
  address               TEXT,
  founded_date          DATE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  deactivated_at        TIMESTAMPTZ,
  deactivation_reason   TEXT,
  -- Req 10.3 — Array de IDs de instructores responsables
  responsible_instructor_ids UUID[] NOT NULL DEFAULT '{}',
  created_by            UUID NOT NULL REFERENCES auth.users(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer academias activas (Req 10.9)
CREATE POLICY "authenticated_read_active_academies" ON academies
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins pueden leer todas (activas e inactivas)
CREATE POLICY "admin_read_all_academies" ON academies
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Solo admins pueden crear/modificar academias
CREATE POLICY "admin_write_academies" ON academies
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Lectura pública para la ruta /academies (sin auth)
CREATE POLICY "public_read_active_academies" ON academies
  FOR SELECT
  USING (is_active = true);

-- ============================================================
-- Table: academy_memberships
-- ============================================================

CREATE TABLE academy_memberships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id       UUID NOT NULL REFERENCES academies(id),
  practitioner_id  UUID NOT NULL REFERENCES practitioners(id),
  joined_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at          DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Req 10.5 — Un practicante solo puede tener una membresía activa a la vez
  CONSTRAINT unique_active_membership
    EXCLUDE USING btree (practitioner_id WITH =)
    WHERE (is_active = true)
);

ALTER TABLE academy_memberships ENABLE ROW LEVEL SECURITY;

-- Practicante puede leer su propia membresía
CREATE POLICY "practitioner_read_own_membership" ON academy_memberships
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Admins pueden leer y escribir todas las membresías
CREATE POLICY "admin_all_memberships" ON academy_memberships
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
