-- Migration: 035_roles_system
-- Description: Crea tabla de roles como catálogo centralizado, tabla junction
--              user_roles para roles a nivel sistema (admin, referee), y
--              migra practitioners.role de CHECK constraint a FK referenciando
--              la tabla roles. Permite agregar nuevos roles sin cambios de esquema.

-- ============================================================
-- 1. TABLA: roles
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  name        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. ROLES INICIALES
-- ============================================================

INSERT INTO roles (name, label, description, is_system) VALUES
  ('administrador', 'Administrador', 'Acceso administrativo completo al sistema',           true),
  ('alumno',        'Alumno',        'Practicante en formación',                             true),
  ('instructor',    'Instructor',    'Instructor certificado a cargo de un dojo',            true),
  ('profesor',      'Profesor',      'Profesor con múltiples dojos o grupos a cargo',        true),
  ('maestro',       'Maestro',       'Maestro de alto grado con autorización de certificar', true),
  ('referee',       'Árbitro',       'Árbitro registrado y habilitado en el sistema',        true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. MIGRAR practitioners.role: DROP CHECK → ADD FK
-- ============================================================

-- Eliminar constraint de CHECK existente
ALTER TABLE practitioners
  DROP CONSTRAINT IF EXISTS practitioners_role_check;

-- Agregar FK hacia roles
ALTER TABLE practitioners
  ADD CONSTRAINT practitioners_role_fkey
    FOREIGN KEY (role) REFERENCES roles(name)
    ON UPDATE CASCADE;

-- ============================================================
-- 4. TABLA: user_roles  (M:N auth.users ↔ roles)
-- Usada para roles de sistema: administrador, referee, etc.
-- No reemplaza admin_users (se mantiene por compatibilidad).
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name  TEXT NOT NULL REFERENCES roles(name) ON UPDATE CASCADE ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id   ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);

-- ============================================================
-- 5. MIGRAR DATOS EXISTENTES A user_roles
-- ============================================================

-- Poblar user_roles con administradores existentes
INSERT INTO user_roles (user_id, role_name, granted_at, granted_by)
SELECT user_id, 'administrador', granted_at, granted_by
FROM   admin_users
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Poblar user_roles con árbitros aprobados existentes
INSERT INTO user_roles (user_id, role_name, granted_at)
SELECT auth_user_id, 'referee', approved_at
FROM   referee_registrations
WHERE  status = 'approved'
  AND  auth_user_id IS NOT NULL
ON CONFLICT (user_id, role_name) DO NOTHING;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer el catálogo de roles
CREATE POLICY "roles_public_read"
  ON roles FOR SELECT
  USING (true);

-- Solo admin puede insertar/modificar/eliminar roles
CREATE POLICY "roles_admin_write"
  ON roles FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Usuarios pueden leer sus propios roles de sistema
CREATE POLICY "user_roles_read_own"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Admin puede leer todos los user_roles
CREATE POLICY "user_roles_admin_read"
  ON user_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Admin puede gestionar todos los user_roles
CREATE POLICY "user_roles_admin_write"
  ON user_roles FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
