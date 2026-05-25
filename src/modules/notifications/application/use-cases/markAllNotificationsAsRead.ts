import { z } from "zod";
import type { NotificationRepository } from "../../domain/interfaces/notificationRepository";

const MarkAllNotificationsAsReadInputSchema = z.object({
  userId: z.string().uuid(),
});

export type MarkAllNotificationsAsReadInput = z.infer<
  typeof MarkAllNotificationsAsReadInputSchema
>;

/**
 * Caso de uso: Marcar todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(
  input: MarkAllNotificationsAsReadInput,
  deps: { notificationRepo: NotificationRepository },
): Promise<void> {
  const parsed = MarkAllNotificationsAsReadInputSchema.parse(input);

  await deps.notificationRepo.markAllAsRead(parsed.userId);
}
