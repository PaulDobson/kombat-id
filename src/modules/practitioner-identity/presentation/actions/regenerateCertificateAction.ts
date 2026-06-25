"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { generateAndStoreMembershipCertificate } from "../../infrastructure/services/membershipCertificateService";
import type { ActionResult } from "@/lib/types";
import { requireAdmin } from "./_requireAdmin";
import { createPractitionerIdentityAdminClient } from "./_practitionerIdentityDeps";

/**
 * Regenera y sobreescribe el certificado de membresía de un practicante.
 * Usa upsert=true en Storage, por lo que reemplaza el archivo existente.
 * Solo accesible para administradores.
 */
export async function regenerateCertificateAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const supabase = createPractitionerIdentityAdminClient();
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
  const { data: practitioner } = await supabase
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
