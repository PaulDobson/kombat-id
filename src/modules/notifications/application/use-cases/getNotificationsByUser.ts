import { z } from "zod";
import type { NotificationRepository } from "../../domain/interfaces/notificationRepository";
import type { NotificationWithStatus } from "../../domain/entities/notification";
import { NotificationCategory } from "../../domain/enums/notificationCategory";

const GetNotificationsByUserInputSchema = z.object({
  userId: z.string().uuid(),
  onlyUnread: z.boolean().optional(),
  categories: z.array(z.nativeEnum(NotificationCategory)).optional(),
  limit: z.number().positive().max(100).default(20),
  offset: z.number().nonnegative().default(0),
});

export type GetNotificationsByUserInput = z.infer<
  typeof GetNotificationsByUserInputSchema
>;

/**
 * Caso de uso: Obtener las notificaciones de un usuario
 */
export async function getNotificationsByUser(
  input: GetNotificationsByUserInput,
  deps: { notificationRepo: NotificationRepository },
): Promise<NotificationWithStatus[]> {
  const parsed = GetNotificationsByUserInputSchema.parse(input);

  return await deps.notificationRepo.findByUserId({
    userId: parsed.userId,
    ...(parsed.onlyUnread !== undefined && { onlyUnread: parsed.onlyUnread }),
    ...(parsed.categories !== undefined && { categories: parsed.categories }),
    limit: parsed.limit,
    offset: parsed.offset,
  });
}
