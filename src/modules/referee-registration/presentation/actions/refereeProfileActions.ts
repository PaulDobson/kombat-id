"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { SupabaseRefereeRegistrationRepository } from "../../infrastructure/repositories/supabaseRefereeRegistrationRepository";
import { updateRefereeRegistration } from "../../application/use-cases/updateRefereeRegistration";
import { RefereeRegistrationNotFoundError } from "../../domain/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

const REFEREE_PROFILE_PATH = "/referee/profile";

// ---------------------------------------------------------------------------
// Auth helper — verifica que el usuario sea el árbitro dueño del registro
// ---------------------------------------------------------------------------

async function requireOwnerReferee(registrationId: string): Promise<{
  userId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "referee") return null;

  // Verificar que el auth_user_id del registro coincida con el usuario actual
  const { data } = await adminSupabase
    .from("referee_registrations")
    .select("auth_user_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (!data || data.auth_user_id !== user.id) return null;

  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

const UpdateProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z
    .string()
    .min(2, "El nombre completo debe tener al menos 2 caracteres")
    .max(200, "El nombre completo no puede superar los 200 caracteres"),
  country: z
    .string()
    .min(1, "El país es obligatorio")
    .max(100, "El país no puede superar los 100 caracteres"),
  registrationNumber: z
    .string()
    .min(1, "El número de registro es obligatorio")
    .max(100, "El número de registro no puede superar los 100 caracteres"),
});

/**
 * Permite al árbitro actualizar sus propios datos personales.
 * Solo puede editar su propio registro — no el de otros árbitros.
 */
export async function updateRefereeOwnProfileAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = UpdateProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const owner = await requireOwnerReferee(parsed.data.id);
  if (!owner) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  try {
    const repo = new SupabaseRefereeRegistrationRepository();
    await updateRefereeRegistration(parsed.data, { repo });
    revalidatePath(REFEREE_PROFILE_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof RefereeRegistrationNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    console.error("[updateRefereeOwnProfileAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
