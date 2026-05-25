/**
 * Enumeración de categorías de notificación
 * Agrupa notificaciones por contexto de negocio
 */
export enum NotificationCategory {
  APPROVAL = "approval", // Aprobaciones pendientes
  EVENT = "event", // Eventos y actividades
  CERTIFICATION = "certification", // Certificaciones
  PAYMENT = "payment", // Pagos y cuotas
  SYSTEM = "system", // Mensajes del sistema
}
