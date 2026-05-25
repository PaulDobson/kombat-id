import { z } from "zod";
import type { NotificationRepository } from "../../domain/interfaces/notificationRepository";

const GetUnreadNotificationsCountInputSchema = z.object({
  userId: z.string().uuid(),
});

export type GetUnreadNotificationsCountInput = z.infer<
  typeof GetUnreadNotificationsCountInputSchema
>;

/**
 * Caso de uso: Obtener el contador de notificaciones no leídas
 */
export async function getUnreadNotificationsCount(
  input: GetUnreadNotificationsCountInput,
  deps: { notificationRepo: NotificationRepository },
): Promise<number> {
  const parsed = GetUnreadNotificationsCountInputSchema.parse(input);

  return await deps.notificationRepo.countUnreadByUserId(parsed.userId);
}
