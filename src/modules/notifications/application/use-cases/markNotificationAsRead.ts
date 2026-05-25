import { z } from "zod";
import type { NotificationRepository } from "../../domain/interfaces/notificationRepository";

const MarkNotificationAsReadInputSchema = z.object({
  notificationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type MarkNotificationAsReadInput = z.infer<
  typeof MarkNotificationAsReadInputSchema
>;

/**
 * Caso de uso: Marcar una notificación como leída
 */
export async function markNotificationAsRead(
  input: MarkNotificationAsReadInput,
  deps: { notificationRepo: NotificationRepository },
): Promise<void> {
  const parsed = MarkNotificationAsReadInputSchema.parse(input);

  await deps.notificationRepo.markAsRead(parsed.notificationId, parsed.userId);
}
