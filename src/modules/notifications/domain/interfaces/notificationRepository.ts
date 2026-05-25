import type {
  Notification,
  NotificationWithStatus,
} from "../entities/notification";
import type { NotificationCategory } from "../enums/notificationCategory";

/**
 * Interfaz del repositorio de notificaciones
 * Abstracción de persistencia para la capa de aplicación
 */
export interface NotificationRepository {
  /**
   * Crea una nueva notificación (sin recipients)
   */
  create(data: Omit<Notification, "id" | "createdAt">): Promise<Notification>;

  /**
   * Agrega destinatarios a una notificación existente
   */
  addRecipients(
    notificationId: string,
    recipientUserIds: string[],
  ): Promise<void>;

  /**
   * Obtiene notificaciones de un usuario con paginación y filtros
   */
  findByUserId(params: {
    userId: string;
    onlyUnread?: boolean;
    categories?: NotificationCategory[];
    limit?: number;
    offset?: number;
  }): Promise<NotificationWithStatus[]>;

  /**
   * Cuenta notificaciones no leídas de un usuario
   */
  countUnreadByUserId(userId: string): Promise<number>;

  /**
   * Marca una notificación como leída para un usuario
   */
  markAsRead(notificationId: string, userId: string): Promise<void>;

  /**
   * Marca todas las notificaciones como leídas para un usuario
   */
  markAllAsRead(userId: string): Promise<void>;

  /**
   * Marca una notificación como accionada para un usuario
   */
  markAsActioned(notificationId: string, userId: string): Promise<void>;

  /**
   * Elimina notificaciones expiradas
   */
  deleteExpired(): Promise<number>;

  /**
   * Busca una notificación por ID
   */
  findById(notificationId: string): Promise<Notification | null>;
}
