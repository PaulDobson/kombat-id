import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { INSTRUCTOR_ROLES, isInstructorRole } from "@/lib/roles";

export interface InstructorPractitioner {
  id: string;
  role: (typeof INSTRUCTOR_ROLES)[number];
  /** Supabase auth.uid() — use this for FK columns that reference auth.users */
  authUserId: string;
}

/** Failure shape — compatible with any ActionResult<T> since success is false */
export interface AuthFailure {
  ok: false;
  error: string;
  code: string;
}

export type AuthAndAuthzResult =
  | { ok: true; practitioner: InstructorPractitioner }
  | AuthFailure;

/**
 * Verifies that the current session belongs to an active instructor-level
 * practitioner (instructor, profesor, or maestro).
 *
 * Returns the practitioner record on success, or an AuthFailure on failure —
 * callers spread the failure into their ActionResult return type.
 */
export async function requireInstructorPractitioner(): Promise<AuthAndAuthzResult> {
  // 1. Authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "No autenticado",
      code: "UNAUTHORIZED",
    };
  }

  // 2. Authorization — fetch active practitioner profile
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!practitioner) {
    return {
      ok: false,
      error: "No se encontró un perfil de practicante activo",
      code: "FORBIDDEN",
    };
  }

  if (!isInstructorRole(practitioner.role)) {
    return {
      ok: false,
      error:
        "Solo instructores, profesores o maestros pueden realizar esta acción",
      code: "FORBIDDEN",
    };
  }

  return {
    ok: true,
    practitioner: {
      id: practitioner.id,
      role: practitioner.role,
      authUserId: user.id,
    },
  };
}
