import { adminSupabase } from "@/lib/supabase/admin";
import type { InstructorAuthService } from "../../application/use-cases/approveInstructorAccountRequest";

const TEMP_PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";

function generateTemporaryPassword(length = 16): string {
  return Array.from(
    { length },
    () =>
      TEMP_PASSWORD_CHARS[
        Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)
      ],
  ).join("");
}

/**
 * Implementación de provisión de usuarios instructor en Supabase Auth.
 */
export function createSupabaseInstructorAuthService(): InstructorAuthService {
  return {
    async inviteInstructorUser(
      email: string,
    ): Promise<{ authUserId: string; temporaryPassword: string }> {
      const temporaryPassword = generateTemporaryPassword();

      const { data: existingData } = await adminSupabase.auth.admin.listUsers({
        perPage: 1000,
      });

      const existingUser = existingData?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );

      if (existingUser) {
        const { error: updateError } =
          await adminSupabase.auth.admin.updateUserById(existingUser.id, {
            password: temporaryPassword,
            app_metadata: { role: "instructor" },
            user_metadata: { must_change_password: true },
          });

        if (updateError) {
          throw new Error(
            updateError.message ?? "Unknown error updating auth user",
          );
        }

        return { authUserId: existingUser.id, temporaryPassword };
      }

      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        app_metadata: { role: "instructor" },
        user_metadata: { must_change_password: true },
      });

      if (error || !data?.user) {
        throw new Error(error?.message ?? "Unknown error creating auth user");
      }

      return { authUserId: data.user.id, temporaryPassword };
    },
  };
}
