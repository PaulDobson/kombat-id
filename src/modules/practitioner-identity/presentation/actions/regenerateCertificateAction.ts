"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { generateAndStoreMembershipCertificate } from "../../infrastructure/services/membershipCertificateService";
import type { ActionResult } from "@/lib/types";

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

/**
 * Regenera y sobreescribe el certificado de membresía de un practicante.
 * Usa upsert=true en Storage, por lo que reemplaza el archivo existente.
 * Solo accesible para administradores.
 */
export async function regenerateCertificateAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // 1. Auth
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  // 2. Validación
  const parsed = z.object({ publicId: z.string().uuid() }).safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "ID de practicante inválido",
      code: "VALIDATION_ERROR",
    };
  }

  // 3. Verificar que el practicante existe y está activo
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, is_active")
    .eq("id", parsed.data.publicId)
    .maybeSingle();

  if (!practitioner) {
    return {
      success: false,
      error: "Practicante no encontrado",
      code: "NOT_FOUND",
    };
  }

  if (!practitioner.is_active) {
    return {
      success: false,
      error: "No se puede regenerar el certificado de un practicante inactivo",
      code: "PRACTITIONER_INACTIVE",
    };
  }

  // 4. Generar y subir (upsert: true sobreescribe el archivo existente)
  try {
    await generateAndStoreMembershipCertificate(parsed.data.publicId);
    revalidatePath(`/admin/practitioners/${parsed.data.publicId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[regenerateCertificateAction] Error:", err);
    return {
      success: false,
      error: "Error al generar el certificado",
      code: "INTERNAL_ERROR",
    };
  }
}
