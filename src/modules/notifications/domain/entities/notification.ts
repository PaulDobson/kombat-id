import type { NotificationType } from "../enums/notificationType";
import type { NotificationCategory } from "../enums/notificationCategory";
import type { NotificationPriority } from "../enums/notificationPriority";

/**
 * Notificación del sistema
 * Representa un evento que debe ser notificado a uno o más usuarios
 */
export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: Record<string, unknown>;
  actorUserId: string | null;
  actorName: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * Información de destinatario de una notificación
 * Representa la relación M:N entre notificaciones y usuarios
 */
export interface NotificationRecipient {
  notificationId: string;
  recipientUserId: string;
  isRead: boolean;
  readAt: Date | null;
  isActioned: boolean;
  actionedAt: Date | null;
}

/**
 * Notificación con estado del destinatario
 * Merge de notificación + datos del recipient para queries de usuario
 */
export interface NotificationWithStatus extends Notification {
  isRead: boolean;
  readAt: Date | null;
  isActioned: boolean;
  actionedAt: Date | null;
}
