-- Migration: 038_notifications_system
-- Description: Sistema de notificaciones para usuarios del sistema Kombat Taekwondo.
--              Soporta notificaciones dirigidas (1:1) y broadcast (1:N) basadas en roles.

-- ============================================================
-- 1. TABLA: notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN ('approval', 'event', 'certification', 'payment', 'system')),
  priority            TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  action_url          TEXT,
  action_label        TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name          TEXT,
  related_entity_type TEXT,
  related_entity_id   UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ
);

CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 2. TABLA: notification_recipients
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_recipients (
  notification_id   UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read           BOOLEAN NOT NULL DEFAULT false,
  read_at           TIMESTAMPTZ,
  is_actioned       BOOLEAN NOT NULL DEFAULT false,
  actioned_at       TIMESTAMPTZ,
  action_result     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, recipient_user_id)
);

CREATE INDEX idx_notification_recipients_user_id ON notification_recipients(recipient_user_id);
CREATE INDEX idx_notification_recipients_user_unread ON notification_recipients(recipient_user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notification_recipients_notification_id ON notification_recipients(notification_id);

-- ============================================================
-- 3. TABLA: notification_templates (Opcional)
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  type                 TEXT PRIMARY KEY,
  category             TEXT NOT NULL,
  default_priority     TEXT NOT NULL DEFAULT 'normal',
  title_template       TEXT NOT NULL,
  message_template     TEXT NOT NULL,
  default_action_label TEXT,
  requires_action      BOOLEAN NOT NULL DEFAULT false,
  expires_in_days      INTEGER,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates iniciales
INSERT INTO notification_templates (type, category, default_priority, title_template, message_template, default_action_label, requires_action) VALUES
  ('new_student_pending',   'approval',      'high',   'Nuevo alumno pendiente de autorización',      '{{actorName}} ha registrado a {{studentName}} ({{studentRut}}). Revisa y autoriza el registro.',                      'Ver solicitud',     true),
  ('event_published',       'event',         'normal', 'Nuevo campeonato publicado',                  '{{actorName}} ha publicado el campeonato "{{eventName}}" para el {{eventDate}}.',                                   'Ver evento',        false),
  ('cert_request_approved', 'certification', 'normal', 'Solicitud de certificación aprobada',         'Tu solicitud de certificación {{certType}} para {{studentName}} ha sido aprobada.',                                 'Ver certificación', false),
  ('cert_request_rejected', 'certification', 'normal', 'Solicitud de certificación rechazada',        'Tu solicitud de certificación {{certType}} para {{studentName}} ha sido rechazada. Motivo: {{reason}}',             null,                false),
  ('grade_updated',         'system',        'normal', 'Cambio de grado',                             'Tu grado ha sido actualizado a {{newGrade}}. ¡Felicitaciones!',                                                     'Ver perfil',        false),
  ('charge_due_soon',       'payment',       'high',   'Cobro próximo a vencer',                      'Tienes un cobro de {{chargeType}} por {{amount}} que vence el {{dueDate}}.',                                        'Ver cobros',        false)
ON CONFLICT (type) DO NOTHING;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- notifications: Admin puede leer todas
CREATE POLICY "notifications_admin_read_all"
  ON notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- notifications: Admin puede crear/actualizar/eliminar
CREATE POLICY "notifications_admin_write"
  ON notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- notifications: Usuarios pueden leer sus propias notificaciones
CREATE POLICY "notifications_recipients_read_own"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notification_recipients nr
      WHERE nr.notification_id = notifications.id
        AND nr.recipient_user_id = auth.uid()
    )
  );

-- notification_recipients: Admin puede leer todos
CREATE POLICY "notification_recipients_admin_read_all"
  ON notification_recipients FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- notification_recipients: Admin puede crear
CREATE POLICY "notification_recipients_admin_write"
  ON notification_recipients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- notification_recipients: Usuarios pueden leer sus propios recipients
CREATE POLICY "notification_recipients_read_own"
  ON notification_recipients FOR SELECT
  USING (recipient_user_id = auth.uid());

-- notification_recipients: Usuarios pueden actualizar sus propias notificaciones (marcar como leída)
CREATE POLICY "notification_recipients_update_own"
  ON notification_recipients FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- notification_templates: Todos pueden leer templates
CREATE POLICY "notification_templates_authenticated_read"
  ON notification_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- notification_templates: Solo admin puede modificar
CREATE POLICY "notification_templates_admin_write"
  ON notification_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- 5. FUNCIÓN: Limpiar notificaciones expiradas (CRON)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Programar limpieza diaria (requiere pg_cron extension)
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_expired_notifications();');
