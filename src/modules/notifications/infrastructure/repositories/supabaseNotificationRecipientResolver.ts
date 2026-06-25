import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { NotificationRecipientResolver } from "../../domain/interfaces/notificationRecipientResolver";

/**
 * Implementación de resolución de destinatarios con Supabase.
 */
export class SupabaseNotificationRecipientResolver implements NotificationRecipientResolver {
  async getAdminUserIds(): Promise<string[]> {
    const { data: rows, error } = await adminSupabase
      .from("admin_users")
      .select("user_id");

    if (error) {
      throw new DomainError(`Failed to fetch admin users: ${error.message}`);
    }

    return rows.map((row) => row.user_id);
  }

  async getUsersByRoles(roles: string[]): Promise<string[]> {
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

  async getUsersByAcademy(academyId: string): Promise<string[]> {
    const { data: rows, error } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner:practitioners!inner(auth_user_id)")
      .eq("academy_id", academyId);

    if (error) {
      throw new DomainError(
        `Failed to fetch users by academy: ${error.message}`,
      );
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

  async getAllAuthenticatedUsers(): Promise<string[]> {
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
}
