"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleEventRegistrationRepository } from "../../infrastructure/repositories/drizzleEventRegistrationRepository";
import { deleteStudentRegistration } from "../../application/use-cases/deleteStudentRegistration";
import {
  RegistrationNotFoundError,
  CannotDeleteConfirmedPaidError,
} from "../../domain/errors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

const DeleteRegistrationSchema = z.object({
  registrationId: z.string().uuid("ID de inscripción inválido"),
  eventId: z.string().uuid("ID de evento inválido"),
});

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"];

async function getInstructorPractitionerId(
  authUserId: string,
): Promise<string | null> {
  const { data } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!data || !INSTRUCTOR_ROLES.includes(data.role ?? "")) {
    return null;
  }

  return data.id;
}

async function getEventRegistrationFee(
  eventId: string,
): Promise<number | null> {
  const { data } = await adminSupabase
    .from("martial_events")
    .select("registration_fee")
    .eq("id", eventId)
    .maybeSingle();

  return data?.registration_fee ?? null;
}

export async function deleteRegistrationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // 1. Authentication
  const user = await requireUser(); // redirects to /login if not authenticated

  // 2. Authorization: verify instructor role
  const instructorId = await getInstructorPractitionerId(user.id);
  if (!instructorId) {
    return {
      success: false,
      error: "No autorizado. Solo instructores pueden eliminar inscripciones.",
      code: "FORBIDDEN",
    };
  }

  // 3. Input validation
  const parsed = DeleteRegistrationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const { registrationId, eventId } = parsed.data;

  try {
    // 4. Fetch event registration fee
    const eventRegistrationFee = await getEventRegistrationFee(eventId);

    // 5. Execute use case (composition root)
    const repository = new DrizzleEventRegistrationRepository();
    await deleteStudentRegistration(
      {
        registrationId,
        instructorId,
        eventRegistrationFee,
      },
      repository,
    );

    // 6. Revalidate enrollment page
    revalidatePath(`/instructor/events/${eventId}/enroll`);

    return { success: true, data: undefined };
  } catch (err) {
    return mapDomainError(err);
  }
}

function mapDomainError(err: unknown): {
  success: false;
  error: string;
  code: string;
} {
  if (err instanceof RegistrationNotFoundError) {
    return {
      success: false,
      error: "Inscripción no encontrada",
      code: "NOT_FOUND",
    };
  }
  if (err instanceof CannotDeleteConfirmedPaidError) {
    return {
      success: false,
      error: err.message,
      code: "CANNOT_DELETE_CONFIRMED_PAID",
    };
  }
  console.error("[deleteRegistrationAction] Unexpected error:", err);
  return {
    success: false,
    error: "Error al eliminar la inscripción",
    code: "INTERNAL_ERROR",
  };
}
