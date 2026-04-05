-- Migration: 001_practitioner_identity
-- Description: Creates all tables, constraints, and RLS policies for the
--              Kombat Taekwondo Identity module.

-- ============================================================
-- TABLES
-- ============================================================

-- practitioners
CREATE TABLE IF NOT EXISTS practitioners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  rut           TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  birth_date    DATE NOT NULL,
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  grade         TEXT NOT NULL DEFAULT 'white' CHECK (grade IN ('white', 'yellow', 'green', 'blue', 'red', 'black')),
  dan           SMALLINT CHECK (dan BETWEEN 1 AND 9),
  start_date    DATE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  contact_phone TEXT,
  contact_email TEXT,
  photo_path    TEXT,
  qr_token      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  weight_kg     NUMERIC(5,2),
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- martial_events
CREATE TABLE IF NOT EXISTS martial_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('competition', 'seminar', 'exam')),
  event_date  DATE NOT NULL,
  location    TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- martial_history
CREATE TABLE IF NOT EXISTS martial_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  event_id        UUID REFERENCES martial_events(id),
  event_type      TEXT NOT NULL CHECK (event_type IN ('competition', 'seminar', 'exam')),
  event_date      DATE NOT NULL,
  result          TEXT,
  notes           TEXT,
  is_corrected    BOOLEAN NOT NULL DEFAULT false,
  correction_note TEXT,
  corrected_at    TIMESTAMPTZ,
  corrected_by    UUID REFERENCES auth.users(id),
  recorded_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, event_id)
);

-- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id)
);

-- ranking_positions
CREATE TABLE IF NOT EXISTS ranking_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  grade           TEXT NOT NULL,
  age_range       TEXT NOT NULL CHECK (age_range IN ('under-12', '12-17', '18-30', '30+')),
  weight_category TEXT NOT NULL CHECK (weight_category IN ('fin', 'fly', 'bantam', 'feather', 'light', 'welter', 'middle', 'heavy')),
  total_points    INTEGER NOT NULL DEFAULT 0,
  position        INTEGER NOT NULL,
  category_count  INTEGER NOT NULL,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, grade, age_range, weight_category)
);

-- ranking_snapshots
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  period_type     TEXT NOT NULL CHECK (period_type IN ('monthly', 'annual')),
  period_label    TEXT NOT NULL,
  position        INTEGER NOT NULL,
  total_points    INTEGER NOT NULL,
  category_count  INTEGER NOT NULL,
  grade           TEXT NOT NULL,
  age_range       TEXT NOT NULL,
  weight_category TEXT NOT NULL,
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- certifications
CREATE TABLE IF NOT EXISTS certifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  cert_type       TEXT NOT NULL CHECK (cert_type IN ('technical_grade', 'instructor', 'referee', 'coach', 'event_participation')),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by       UUID NOT NULL REFERENCES auth.users(id),
  is_revoked      BOOLEAN NOT NULL DEFAULT false,
  revoked_at      TIMESTAMPTZ,
  revocation_reason TEXT,
  revoked_by      UUID REFERENCES auth.users(id),
  practitioner_snapshot JSONB NOT NULL,
  notes           TEXT
);

-- qr_scan_events
CREATE TABLE IF NOT EXISTS qr_scan_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_token   UUID NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE martial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE martial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: practitioners
-- ============================================================

CREATE POLICY "practitioner_read_own"
  ON practitioners FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "admin_read_all_practitioners"
  ON practitioners FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_write_practitioners"
  ON practitioners FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- RLS POLICIES: martial_events
-- ============================================================

CREATE POLICY "authenticated_read_events"
  ON martial_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_write_events"
  ON martial_events FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- RLS POLICIES: martial_history
-- ============================================================

CREATE POLICY "practitioner_read_own_history"
  ON martial_history FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_history"
  ON martial_history FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- RLS POLICIES: admin_users
-- ============================================================

CREATE POLICY "admin_read_admins"
  ON admin_users FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- RLS POLICIES: ranking_positions
-- ============================================================

CREATE POLICY "authenticated_read_ranking"
  ON ranking_positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_role_write_ranking"
  ON ranking_positions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES: ranking_snapshots
-- ============================================================

CREATE POLICY "practitioner_read_own_snapshots"
  ON ranking_snapshots FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_read_all_snapshots"
  ON ranking_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- RLS POLICIES: certifications
-- ============================================================

CREATE POLICY "practitioner_read_own_certs"
  ON certifications FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Public verification URL: anyone can read certifications
CREATE POLICY "public_read_certs"
  ON certifications FOR SELECT
  USING (true);

CREATE POLICY "admin_write_certs"
  ON certifications FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- RLS POLICIES: qr_scan_events
-- ============================================================

CREATE POLICY "admin_read_scans"
  ON qr_scan_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- RLS POLICIES: audit_log
-- ============================================================

CREATE POLICY "admin_read_audit"
  ON audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "service_role_write_audit"
  ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
