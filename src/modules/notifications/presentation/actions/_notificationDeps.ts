import { DrizzleNotificationRepository } from "../../infrastructure/repositories/drizzleNotificationRepository";
import { SupabaseNotificationRecipientResolver } from "../../infrastructure/repositories/supabaseNotificationRecipientResolver";

/**
 * Punto único de composición para casos de uso de notificaciones.
 */
export function createNotificationModuleDeps() {
  return {
    notificationRepo: new DrizzleNotificationRepository(),
    recipientResolver: new SupabaseNotificationRecipientResolver(),
  };
}
