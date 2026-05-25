/**
 * Enumeración de tipos de notificación
 * Define todos los tipos posibles de eventos notificables en el sistema
 */
export enum NotificationType {
  // Aprobaciones
  NEW_STUDENT_PENDING = "new_student_pending",
  INSTRUCTOR_REQUEST_PENDING = "instructor_request_pending",

  // Eventos
  EVENT_PUBLISHED = "event_published",
  EVENT_CANCELLED = "event_cancelled",
  EVENT_REMINDER = "event_reminder",

  // Certificaciones
  CERT_REQUEST_APPROVED = "cert_request_approved",
  CERT_REQUEST_REJECTED = "cert_request_rejected",

  // Pagos/Cuotas
  CHARGE_DUE_SOON = "charge_due_soon",
  CHARGE_OVERDUE = "charge_overdue",

  // Grados
  GRADE_UPDATED = "grade_updated",
  EXAM_SCHEDULED = "exam_scheduled",

  // Sistema
  SYSTEM_MAINTENANCE = "system_maintenance",
  SYSTEM_UPDATE = "system_update",
  ACCOUNT_VERIFIED = "account_verified",
}
