"use server";

import { requireUser } from "@/lib/supabase/server";
import { markNotificationAsRead } from "../../application/use-cases/markNotificationAsRead";
import { markAllNotificationsAsRead } from "../../application/use-cases/markAllNotificationsAsRead";
import { getUnreadNotificationsCount } from "../../application/use-cases/getUnreadNotificationsCount";
import { getNotificationsByUser } from "../../application/use-cases/getNotificationsByUser";
import type { NotificationWithStatus } from "../../domain/entities/notification";
import type { NotificationCategory } from "../../domain/enums/notificationCategory";
import { createNotificationModuleDeps } from "./_notificationDeps";

/**
 * Server Action: Marca una notificación como leída
 */
export async function markAsReadAction(notificationId: string): Promise<void> {
  const user = await requireUser();
  const { notificationRepo } = createNotificationModuleDeps();

  try {
    await markNotificationAsRead(
      { notificationId, userId: user.id },
      { notificationRepo },
    );
  } catch (error) {
    console.error("[markAsReadAction] Error:", error);
    throw new Error("No se pudo marcar la notificación como leída");
  }
}

/**
 * Server Action: Marca todas las notificaciones como leídas
 */
export async function markAllAsReadAction(): Promise<void> {
  const user = await requireUser();
  const { notificationRepo } = createNotificationModuleDeps();

  try {
    await markAllNotificationsAsRead({ userId: user.id }, { notificationRepo });
  } catch (error) {
    console.error("[markAllAsReadAction] Error:", error);
    throw new Error("No se pudieron marcar las notificaciones como leídas");
  }
}

/**
 * Server Action: Obtiene el contador de notificaciones no leídas
 */
export async function getUnreadCountAction(): Promise<number> {
  const user = await requireUser();
  const { notificationRepo } = createNotificationModuleDeps();

  try {
    return await getUnreadNotificationsCount(
      { userId: user.id },
      { notificationRepo },
    );
  } catch (error) {
    console.error("[getUnreadCountAction] Error:", error);
    return 0;
  }
}

/**
 * Server Action: Obtiene las notificaciones del usuario
 */
export async function getUserNotificationsAction(params?: {
  onlyUnread?: boolean;
  categories?: NotificationCategory[];
  limit?: number;
  offset?: number;
}): Promise<NotificationWithStatus[]> {
  const user = await requireUser();
  const { notificationRepo } = createNotificationModuleDeps();

  try {
    return await getNotificationsByUser(
      {
        userId: user.id,
        onlyUnread: params?.onlyUnread,
        categories: params?.categories,
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      },
      { notificationRepo },
    );
  } catch (error) {
    console.error("[getUserNotificationsAction] Error:", error);
    return [];
  }
}
