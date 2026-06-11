import { z } from "zod";
import type { NotificationRepository } from "../../domain/interfaces/notificationRepository";
import { NotificationType } from "../../domain/enums/notificationType";
import { NotificationCategory } from "../../domain/enums/notificationCategory";
import { NotificationPriority } from "../../domain/enums/notificationPriority";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";

/**
 * Estrategias de destinatarios
 */
type _RecipientStrategy =
  | "specific_users" // Lista explícita de user IDs
  | "role_based" // Todos los usuarios con uno o más roles
  | "academy_members" // Todos los miembros de una academia
  | "all_users"; // Todos los usuarios autenticados

/**
 * Input para crear una notificación
 */
const CreateNotificationInputSchema = z.object({
  type: z.nativeEnum(NotificationType),
  category: z.nativeEnum(NotificationCategory),
  priority: z.nativeEnum(NotificationPriority),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  actionUrl: z.string().nullable(),
  actionLabel: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  actorUserId: z.string().nullable(),
  actorName: z.string().nullable(),
  relatedEntityType: z.string().nullable(),
  relatedEntityId: z.string().nullable(),
  expiresInDays: z.number().positive().nullable(),

  // Estrategia de destinatarios
  recipientStrategy: z.enum([
    "specific_users",
    "role_based",
    "academy_members",
    "all_users",
  ]),
  specificUserIds: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  academyId: z.string().optional(),
});

export type CreateNotificationInput = z.infer<
  typeof CreateNotificationInputSchema
>;

/**
 * Caso de uso: Crear una notificación y asignar destinatarios
 */
export async function createNotification(
  input: CreateNotificationInput,
  deps: { notificationRepo: NotificationRepository },
): Promise<string> {
  const parsed = CreateNotificationInputSchema.parse(input);

  // Calcular fecha de expiración:
  // - Si se especifica expiresInDays, usar ese valor
  // - Si es null, aplicar el máximo por defecto de 3 días
  const DEFAULT_EXPIRY_DAYS = 3;
  const daysToExpire = parsed.expiresInDays ?? DEFAULT_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);

  // 1. Crear la notificación
  const notification = await deps.notificationRepo.create({
    type: parsed.type,
    category: parsed.category,
    priority: parsed.priority,
    title: parsed.title,
    message: parsed.message,
    actionUrl: parsed.actionUrl,
    actionLabel: parsed.actionLabel,
    metadata: parsed.metadata,
    actorUserId: parsed.actorUserId,
    actorName: parsed.actorName,
    relatedEntityType: parsed.relatedEntityType,
    relatedEntityId: parsed.relatedEntityId,
    expiresAt,
  });

  // 2. Resolver destinatarios según estrategia
  let recipientUserIds: string[];

  switch (parsed.recipientStrategy) {
    case "specific_users":
      if (parsed.specificUserIds && parsed.specificUserIds.length > 0) {
        recipientUserIds = parsed.specificUserIds;
      } else {
        // Caso especial: notificar a admins
        recipientUserIds = await getAdminUserIds();
      }
      break;

    case "role_based":
      if (!parsed.roles || parsed.roles.length === 0) {
        throw new DomainError("roles is required for role_based strategy");
      }
      recipientUserIds = await getUsersByRoles(parsed.roles);
      break;

    case "academy_members":
      if (!parsed.academyId) {
        throw new DomainError(
          "academyId is required for academy_members strategy",
        );
      }
      recipientUserIds = await getUsersByAcademy(parsed.academyId);
      break;

    case "all_users":
      recipientUserIds = await getAllAuthenticatedUsers();
      break;

    default:
      throw new DomainError(
        `Unknown recipient strategy: ${parsed.recipientStrategy as string}`,
      );
  }

  // 3. Agregar destinatarios
  if (recipientUserIds.length > 0) {
    await deps.notificationRepo.addRecipients(
      notification.id,
      recipientUserIds,
    );
  }

  return notification.id;
}

/**
 * Helper: Obtiene los auth_user_id de todos los admin_users
 */
async function getAdminUserIds(): Promise<string[]> {
  const { data: rows, error } = await adminSupabase
    .from("admin_users")
    .select("user_id");

  if (error) {
    throw new DomainError(`Failed to fetch admin users: ${error.message}`);
  }

  return rows.map((row) => row.user_id);
}

/**
 * Helper: Obtiene los auth_user_id de practicantes con los roles especificados
 */
async function getUsersByRoles(roles: string[]): Promise<string[]> {
  const { data: rows, error } = await adminSupabase
    .from("practitioners")
    .select("auth_user_id")
    .in("role", roles)
    .not("auth_user_id", "is", null);

  if (error) {
    throw new DomainError(`Failed to fetch users by roles: ${error.message}`);
  }

  return rows
    .map((row) => row.auth_user_id)
    .filter((id): id is string => id !== null);
}

/**
 * Helper: Obtiene los auth_user_id de todos los miembros de una academia
 */
async function getUsersByAcademy(academyId: string): Promise<string[]> {
  const { data: rows, error } = await adminSupabase
    .from("academy_memberships")
    .select("practitioner:practitioners!inner(auth_user_id)")
    .eq("academy_id", academyId);

  if (error) {
    throw new DomainError(`Failed to fetch users by academy: ${error.message}`);
  }

  return rows
    .map((row) => {
      const practitioner = Array.isArray(row.practitioner)
        ? row.practitioner[0]
        : row.practitioner;
      return practitioner?.auth_user_id;
    })
    .filter((id): id is string => id !== null && id !== undefined);
}

/**
 * Helper: Obtiene los auth_user_id de todos los usuarios autenticados con practitioner
 */
async function getAllAuthenticatedUsers(): Promise<string[]> {
  const { data: rows, error } = await adminSupabase
    .from("practitioners")
    .select("auth_user_id")
    .not("auth_user_id", "is", null);

  if (error) {
    throw new DomainError(`Failed to fetch all users: ${error.message}`);
  }

  return rows
    .map((row) => row.auth_user_id)
    .filter((id): id is string => id !== null);
}
