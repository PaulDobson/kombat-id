/**
 * Enumeración de prioridades de notificación
 * Determina la urgencia visual y el orden de presentación
 */
export enum NotificationPriority {
  LOW = "low", // Informativa, no urgente
  NORMAL = "normal", // Importancia estándar
  HIGH = "high", // Requiere atención pronta
  URGENT = "urgent", // Requiere acción inmediata
}
