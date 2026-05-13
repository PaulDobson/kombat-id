"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleEventRegistrationRepository } from "../../infrastructure/repositories/drizzleEventRegistrationRepository";
import { enrollStudents } from "../../application/use-cases/enrollStudents";
import { EventAtCapacityError } from "../../domain/errors";
import { INSTRUCTOR_ROLES } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const EnrollStudentsSchema = z.object({
  eventId: z.string().uuid("El ID del evento debe ser un UUID válido"),
  practitionerIds: z
    .array(z.string().uuid("Cada ID de alumno debe ser un UUID válido"))
    .min(1, "Debes seleccionar al menos un alumno"),
});

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Enrolls one or more students in an event on behalf of the authenticated instructor.
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6
 */
export async function enrollStudentsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ enrolled: string[]; skipped: { id: string; name: string }[] }>
> {
  // 1. Authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  // 2. Authorization — verify instructor role
  const { data: instructor } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!instructor) {
    return {
      success: false,
      error: "No se encontró un perfil de practicante activo",
      code: "FORBIDDEN",
    };
  }

  if (
    !INSTRUCTOR_ROLES.includes(
      instructor.role as (typeof INSTRUCTOR_ROLES)[number],
    )
  ) {
    return {
      success: false,
      error:
        "Solo instructores, profesores o maestros pueden inscribir alumnos",
      code: "FORBIDDEN",
    };
  }

  // 3. Input validation
  const parsed = EnrollStudentsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const { eventId, practitionerIds } = parsed.data;
  const instructorId = instructor.id as string;

  // 4. Verify all practitionerIds belong to the instructor's academy
  const { data: students, error: studentsError } = await adminSupabase
    .from("practitioners")
    .select("id, full_name")
    .in("id", practitionerIds)
    .eq("role", "alumno");

  if (studentsError) {
    console.error(
      "[enrollStudentsAction] Error fetching students:",
      studentsError,
    );
    return {
      success: false,
      error: "Error al verificar los alumnos",
      code: "INTERNAL_ERROR",
    };
  }

  const foundIds = new Set((students ?? []).map((s) => s.id));
  const notFound = practitionerIds.filter((id) => !foundIds.has(id));
  if (notFound.length > 0) {
    return {
      success: false,
      error: "Uno o más alumnos no fueron encontrados",
      code: "NOT_FOUND",
    };
  }

  // Verify all students belong to an academy where the instructor is responsible
  const { data: instructorAcademies } = await adminSupabase
    .from("academies")
    .select("id")
    .contains("responsible_instructor_ids", [instructorId]);

  const instructorAcademyIds = (instructorAcademies ?? []).map(
    (a: { id: string }) => a.id,
  );

  if (instructorAcademyIds.length === 0) {
    return {
      success: false,
      error: "No tienes academias asignadas",
      code: "FORBIDDEN",
    };
  }

  const { data: memberships } = await adminSupabase
    .from("academy_memberships")
    .select("practitioner_id")
    .in("academy_id", instructorAcademyIds)
    .in("practitioner_id", practitionerIds)
    .eq("is_active", true);

  const authorizedIds = new Set(
    (memberships ?? []).map(
      (m: { practitioner_id: string }) => m.practitioner_id,
    ),
  );
  const unauthorized = practitionerIds.filter((id) => !authorizedIds.has(id));
  if (unauthorized.length > 0) {
    return {
      success: false,
      error: "Solo puedes inscribir alumnos de tu academia",
      code: "FORBIDDEN",
    };
  }

  // 5. Fetch event to get registrationFee and maxParticipants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error: eventError } = await (adminSupabase as any)
    .from("martial_events")
    .select("id, registration_fee, max_participants")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return {
      success: false,
      error: "Evento no encontrado",
      code: "NOT_FOUND",
    };
  }

  // 6. Call enrollStudents use case
  try {
    const repository = new DrizzleEventRegistrationRepository();

    const practitioners = (students ?? []).map((s) => ({
      id: s.id as string,
      name: s.full_name as string,
    }));

    const result = await enrollStudents(
      {
        instructorId,
        eventId,
        registrationFee: (event.registration_fee as number | null) ?? null,
        maxParticipants: (event.max_participants as number | null) ?? null,
        practitioners,
      },
      repository,
    );

    // 7. Revalidate relevant paths
    revalidatePath(`/instructor/events/${eventId}/enroll`);
    revalidatePath(`/instructor/events`);
    revalidatePath(`/admin/events/${eventId}/registrations`);

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof EventAtCapacityError) {
      return {
        success: false,
        error: "El evento ha alcanzado el aforo máximo",
        code: "EVENT_AT_CAPACITY",
      };
    }
    console.error("[enrollStudentsAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
