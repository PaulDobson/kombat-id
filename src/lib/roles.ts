import type { PractitionerRole, SystemRole } from "@/types/database.types";

// ============================================================
// Constantes de roles
// ============================================================

export const ROLE_LABELS: Record<string, string> = {
  administrador: "Administrador",
  alumno: "Alumno",
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
  referee: "Árbitro",
};

export const INSTRUCTOR_ROLES = [
  "instructor",
  "profesor",
  "maestro",
] as const satisfies readonly PractitionerRole[];

export type InstructorRole = (typeof INSTRUCTOR_ROLES)[number];

export function isInstructorRole(role: string): role is InstructorRole {
  return (INSTRUCTOR_ROLES as readonly string[]).includes(role);
}

// ============================================================
// Consulta de roles de sistema desde la tabla user_roles
// ============================================================

/**
 * Devuelve los roles de sistema asignados a un usuario desde la tabla user_roles.
 * Requiere el cliente adminSupabase para saltarse RLS en contextos de servidor.
 */
export async function getUserSystemRoles(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
): Promise<SystemRole[]> {
  const { data, error } = await adminClient
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId);

  if (error || !data) return [];
  return (data as { role_name: string }[]).map(
    (r) => r.role_name as SystemRole,
  );
}

/**
 * Verifica si un usuario tiene un rol de sistema específico.
 */
export async function hasSystemRole(
  userId: string,
  role: SystemRole,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
): Promise<boolean> {
  const { data } = await adminClient
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .eq("role_name", role)
    .maybeSingle();
  return !!data;
}

/**
 * Asigna un rol de sistema a un usuario.
 * Es idempotente gracias al ON CONFLICT DO NOTHING de la PK.
 */
export async function assignSystemRole(
  userId: string,
  role: SystemRole,
  grantedBy: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
): Promise<void> {
  await adminClient
    .from("user_roles")
    .upsert(
      { user_id: userId, role_name: role, granted_by: grantedBy },
      { onConflict: "user_id,role_name", ignoreDuplicates: true },
    );
}

/**
 * Revoca un rol de sistema de un usuario.
 */
export async function revokeSystemRole(
  userId: string,
  role: SystemRole,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
): Promise<void> {
  await adminClient
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_name", role);
}
