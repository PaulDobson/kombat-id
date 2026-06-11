"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleEventRegistrationRepository } from "../../infrastructure/repositories/drizzleEventRegistrationRepository";
import {
  determineInitialStatus,
  hasCapacity,
} from "../../domain/entities/eventRegistration";
import {
  EventAtCapacityError,
  AlreadyRegisteredError,
} from "../../domain/errors";
import { INSTRUCTOR_ROLES } from "@/lib/roles";
import type { ActionResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const EnrollSelfSchema = z.object({
  eventId: z.string().uuid("El ID del evento debe ser un UUID válido"),
});

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Enrolls the authenticated instructor as a participant in an event.
 * Used for seminars, courses, and other federation events aimed at instructors.
 */
export async function enrollSelfAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // 1. Authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  // 2. Authorization — must be an instructor-level practitioner
  const { data: instructor } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!instructor) {
    return {
      success: false,
      error: "No se encontró un perfil de instructor activo",
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
      error: "Solo instructores, profesores o maestros pueden inscribirse",
      code: "FORBIDDEN",
    };
  }

  // 3. Input validation
  const parsed = EnrollSelfSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const { eventId } = parsed.data;
  const instructorId = instructor.id as string;

  // 4. Fetch event details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error: eventError } = await (adminSupabase as any)
    .from("martial_events")
    .select("id, registration_fee, max_participants")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { success: false, error: "Evento no encontrado", code: "NOT_FOUND" };
  }

  // 5. Execute enrollment via repository
  try {
    const repository = new DrizzleEventRegistrationRepository();

    // Check capacity
    const confirmedCount = await repository.countConfirmedByEvent(eventId);
    if (!hasCapacity(event.max_participants as number | null, confirmedCount)) {
      throw new EventAtCapacityError();
    }

    // Check for existing registration
    const existing = await repository.findByPractitionerAndEvent(
      instructorId,
      eventId,
    );
    if (existing) {
      throw new AlreadyRegisteredError(instructor.full_name as string);
    }

    const now = new Date().toISOString();
    const status = determineInitialStatus(
      event.registration_fee as number | null,
    );

    await repository.save({
      id: crypto.randomUUID(),
      eventId,
      practitionerId: instructorId,
      instructorId, // instructor is both the practitioner and the instructor
      status,
      registeredAt: now,
      confirmedAt: status === "confirmada" ? now : null,
      confirmedBy: status === "confirmada" ? instructorId : null,
      cancelledAt: null,
      cancelledBy: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath(`/instructor/events/${eventId}/enroll`);
    revalidatePath(`/instructor/events`);
    revalidatePath(`/admin/events/${eventId}/registrations`);

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof EventAtCapacityError) {
      return {
        success: false,
        error: "El evento ha alcanzado el aforo máximo",
        code: "EVENT_AT_CAPACITY",
      };
    }
    if (err instanceof AlreadyRegisteredError) {
      return {
        success: false,
        error: "Ya estás inscrito en este evento",
        code: "ALREADY_REGISTERED",
      };
    }
    console.error("[enrollSelfAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
