import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getIsAdmin } from "@/lib/request-cache";
import { isInstructorRole } from "@/lib/roles";
import type { InstructorRole } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Admin guard
// ---------------------------------------------------------------------------

/**
 * Verifica que la sesión actual pertenezca a un usuario administrador.
 * Usa React.cache() internamente — si DashboardNav ya llamó requireUser() y
 * getIsAdmin() en el mismo request, NO se disparan queries adicionales a la DB.
 *
 * Uso en Server Components y Server Actions:
 *   const user = await requireAdmin();
 *   // user.id disponible para auditoría
 */
export async function requireAdmin(redirectTo = "/dashboard") {
  const user = await requireUser(); // deduplicado vía React.cache()
  const isAdmin = await getIsAdmin(user.id); // deduplicado vía React.cache()
  if (!isAdmin) redirect(redirectTo);
  return user;
}

// ---------------------------------------------------------------------------
// Instructor guard
// ---------------------------------------------------------------------------

export interface InstructorSession {
  /** Supabase auth user id */
  userId: string;
  /** practitioners.id (UUID) */
  practitionerId: string;
  /** Practitioner display name */
  fullName: string;
  /** Practitioner role */
  role: InstructorRole;
}

/**
 * Verifies the current session belongs to an active instructor-role practitioner.
 * Redirects to /dashboard if the user is not authenticated or does not have an
 * instructor role (instructor / profesor / maestro).
 *
 * Usage in Server Components and Server Actions:
 *   const session = await requireInstructor();
 *   // session.practitionerId, session.userId, session.fullName, session.role
 */
export async function requireInstructor(
  redirectTo = "/dashboard",
): Promise<InstructorSession> {
  const user = await requireUser();

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!practitioner || !isInstructorRole(practitioner.role as string)) {
    redirect(redirectTo);
  }

  return {
    userId: user.id,
    practitionerId: practitioner.id as string,
    fullName: practitioner.full_name as string,
    role: practitioner.role as InstructorRole,
  };
}
