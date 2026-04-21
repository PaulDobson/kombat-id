"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleEventRegistrationRepository } from "../../infrastructure/repositories/drizzleEventRegistrationRepository";
import { confirmPayment } from "../../application/use-cases/confirmPayment";
import { cancelRegistration } from "../../application/use-cases/cancelRegistration";
import {
  RegistrationNotFoundError,
  RegistrationAlreadyConfirmedError,
} from "../../domain/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const RegistrationActionSchema = z.object({
  registrationId: z.string().min(1, "El ID de inscripción es obligatorio"),
  eventId: z.string().min(1, "El ID del evento es obligatorio"),
});

// ---------------------------------------------------------------------------
// Error mapper
// ---------------------------------------------------------------------------

function mapDomainError(err: unknown): { error: string; code: string } {
  if (err instanceof RegistrationNotFoundError) {
    return { error: "Inscripción no encontrada", code: "NOT_FOUND" };
  }
  if (err instanceof RegistrationAlreadyConfirmedError) {
    return {
      error: "Esta inscripción ya está confirmada",
      code: "ALREADY_CONFIRMED",
    };
  }
  console.error("[registrationActions] Unexpected error:", err);
  return { error: "Error interno del servidor", code: "INTERNAL_ERROR" };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Confirms payment for a registration with status 'pendiente_pago'.
 * Requires admin authentication.
 * Validates: Requirements 5.3, 5.4, 6.4, 6.5
 */
export async function confirmPaymentAction(input: {
  registrationId: string;
  eventId: string;
}): Promise<ActionResult> {
  // 1. Authentication & authorization
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  // 2. Input validation
  const parsed = RegistrationActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const { registrationId, eventId } = parsed.data;

  // 3. Execute use case
  try {
    const repository = new DrizzleEventRegistrationRepository();
    await confirmPayment({ adminId: admin.userId, registrationId }, repository);

    revalidatePath(`/admin/events/${eventId}/registrations`);

    return { success: true, data: undefined };
  } catch (err) {
    const mapped = mapDomainError(err);
    return { success: false, ...mapped };
  }
}

/**
 * Cancels a registration.
 * Requires admin authentication.
 * Validates: Requirements 5.6, 6.4
 */
export async function cancelRegistrationAction(input: {
  registrationId: string;
  eventId: string;
}): Promise<ActionResult> {
  // 1. Authentication & authorization
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  // 2. Input validation
  const parsed = RegistrationActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const { registrationId, eventId } = parsed.data;

  // 3. Execute use case
  try {
    const repository = new DrizzleEventRegistrationRepository();
    await cancelRegistration(
      { adminId: admin.userId, registrationId },
      repository,
    );

    revalidatePath(`/admin/events/${eventId}/registrations`);

    return { success: true, data: undefined };
  } catch (err) {
    const mapped = mapDomainError(err);
    return { success: false, ...mapped };
  }
}
