import { adminSupabase } from "@/lib/supabase/admin";
import type {
  Notification,
  NotificationWithStatus,
} from "../../domain/entities/notification";
import type { NotificationRepository } from "../../domain/interfaces/notificationRepository";
import type { NotificationCategory } from "../../domain/enums/notificationCategory";
import { DomainError } from "@/lib/errors";

/**
 * Implementación del repositorio de notificaciones usando Supabase
 * Usa adminSupabase para bypass RLS (las políticas se validan en Server Actions)
 */
export class DrizzleNotificationRepository implements NotificationRepository {
  async create(
    data: Omit<Notification, "id" | "createdAt">,
  ): Promise<Notification> {
    const { data: row, error } = await adminSupabase
      .from("notifications")
      .insert({
        type: data.type,
        category: data.category,
        priority: data.priority,
        title: data.title,
        message: data.message,
        action_url: data.actionUrl,
        action_label: data.actionLabel,
        metadata: data.metadata as never,
        actor_user_id: data.actorUserId,
        actor_name: data.actorName,
        related_entity_type: data.relatedEntityType,
        related_entity_id: data.relatedEntityId,
        expires_at: data.expiresAt?.toISOString() ?? null,
      })
      .select()
      .single();

    if (error || !row) {
      throw new DomainError(
        `Failed to create notification: ${error?.message ?? "Unknown error"}`,
      );
    }

    return this.toEntity(row);
  }

  async addRecipients(
    notificationId: string,
    recipientUserIds: string[],
  ): Promise<void> {
    const { error } = await adminSupabase
      .from("notification_recipients")
      .insert(
        recipientUserIds.map((userId) => ({
          notification_id: notificationId,
          recipient_user_id: userId,
          is_read: false,
          is_actioned: false,
        })),
      );

    if (error) {
      throw new DomainError(`Failed to add recipients: ${error.message}`);
    }
  }

  async findByUserId(params: {
    userId: string;
    onlyUnread?: boolean;
    categories?: NotificationCategory[];
    limit?: number;
    offset?: number;
  }): Promise<NotificationWithStatus[]> {
    let query = adminSupabase
      .from("notification_recipients")
      .select(
        `
        notification_id,
        is_read,
        read_at,
        is_actioned,
        actioned_at,
        notifications (
          id,
          type,
          category,
          priority,
          title,
          message,
          action_url,
          action_label,
          metadata,
          actor_user_id,
          actor_name,
          related_entity_type,
          related_entity_id,
          created_at,
          expires_at
        )
      `,
      )
      .eq("recipient_user_id", params.userId)
      .order("created_at", { ascending: false, foreignTable: "notifications" });

    if (params.onlyUnread) {
      query = query.eq("is_read", false);
    }

    if (params.categories && params.categories.length > 0) {
      query = query.in("notifications.category", params.categories);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit ?? 10) - 1,
      );
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new DomainError(
        `Failed to find notifications by user: ${error.message}`,
      );
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows
      .filter((row) => row.notifications !== null)
      .map((row) => {
        const notif = Array.isArray(row.notifications)
          ? row.notifications[0]
          : row.notifications;

        if (!notif) {
          throw new DomainError("Invalid notification data structure");
        }

        return {
          id: notif.id,
          type: notif.type,
          category: notif.category,
          priority: notif.priority,
          title: notif.title,
          message: notif.message,
          actionUrl: notif.action_url,
          actionLabel: notif.action_label,
          metadata: (notif.metadata as Record<string, unknown>) ?? {},
          actorUserId: notif.actor_user_id,
          actorName: notif.actor_name,
          relatedEntityType: notif.related_entity_type,
          relatedEntityId: notif.related_entity_id,
          createdAt: new Date(notif.created_at),
          expiresAt: notif.expires_at ? new Date(notif.expires_at) : null,
          isRead: row.is_read,
          readAt: row.read_at ? new Date(row.read_at) : null,
          isActioned: row.is_actioned,
          actionedAt: row.actioned_at ? new Date(row.actioned_at) : null,
        };
      });
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const { count, error } = await adminSupabase
      .from("notification_recipients")
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .eq("is_read", false);

    if (error) {
      throw new DomainError(
        `Failed to count unread notifications: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await adminSupabase
      .from("notification_recipients")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("notification_id", notificationId)
      .eq("recipient_user_id", userId);

    if (error) {
      throw new DomainError(
        `Failed to mark notification as read: ${error.message}`,
      );
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await adminSupabase
      .from("notification_recipients")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("recipient_user_id", userId)
      .eq("is_read", false);

    if (error) {
      throw new DomainError(
        `Failed to mark all notifications as read: ${error.message}`,
      );
    }
  }

  async markAsActioned(notificationId: string, userId: string): Promise<void> {
    const { error } = await adminSupabase
      .from("notification_recipients")
      .update({
        is_actioned: true,
        actioned_at: new Date().toISOString(),
      })
      .eq("notification_id", notificationId)
      .eq("recipient_user_id", userId);

    if (error) {
      throw new DomainError(
        `Failed to mark notification as actioned: ${error.message}`,
      );
    }
  }

  async deleteExpired(): Promise<number> {
    const { data, error } = await adminSupabase
      .from("notifications")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select();

    if (error) {
      throw new DomainError(
        `Failed to delete expired notifications: ${error.message}`,
      );
    }

    return data?.length ?? 0;
  }

  async findById(notificationId: string): Promise<Notification | null> {
    const { data: row, error } = await adminSupabase
      .from("notifications")
      .select()
      .eq("id", notificationId)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find notification by ID: ${error.message}`,
      );
    }

    if (!row) {
      return null;
    }

    return this.toEntity(row);
  }

  /**
   * Transforma row de DB (snake_case) a entidad de dominio (camelCase)
   */
  private toEntity(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      type: row.type as Notification["type"],
      category: row.category as Notification["category"],
      priority: row.priority as Notification["priority"],
      title: row.title as string,
      message: row.message as string,
      actionUrl: row.action_url as string | null,
      actionLabel: row.action_label as string | null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      actorUserId: row.actor_user_id as string | null,
      actorName: row.actor_name as string | null,
      relatedEntityType: row.related_entity_type as string | null,
      relatedEntityId: row.related_entity_id as string | null,
      createdAt: new Date(row.created_at as string),
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    };
  }
}
