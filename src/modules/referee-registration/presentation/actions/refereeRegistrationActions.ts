"use server";

import { SupabaseRefereeRegistrationRepository } from "../../infrastructure/repositories/supabaseRefereeRegistrationRepository";
import {
  SubmitRefereeRegistrationInput,
  submitRefereeRegistration,
} from "../../application/use-cases/submitRefereeRegistration";
import {
  DuplicateRefereeEmailError,
  DuplicateRegistrationNumberError,
} from "../../domain/errors";
import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { getRefereeProfile } from "../../application/use-cases/getRefereeProfile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---------------------------------------------------------------------------
// Public action — no authentication required
// Validates: Propiedad 4 — ActionResult siempre tipado
// ---------------------------------------------------------------------------

/**
 * Submits a new referee registration from the public form.
 * Accepts FormData so the PDF upload happens server-side via adminSupabase,
 * avoiding the need for public Storage bucket policies.
 * Does not require authentication.
 * Validates: Requisitos 2.2, 2.3, 2.4, 14.1, 14.2, 14.3, 14.4
 */
export async function submitRefereeRegistrationAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  // 1. Extract and validate text fields
  const rawInput = {
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    country: formData.get("country"),
    registrationNumber: formData.get("registrationNumber"),
  };

  const textParsed = SubmitRefereeRegistrationInput.omit({
    certificatePath: true,
  }).safeParse(rawInput);

  if (!textParsed.success) {
    return {
      success: false,
      error: textParsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  // 2. Handle optional PDF upload server-side using adminSupabase
  const file = formData.get("certificate");
  let storagePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") {
      return {
        success: false,
        error: "Solo se aceptan archivos PDF",
        code: "VALIDATION_ERROR",
      };
    }

    const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_PDF_SIZE) {
      return {
        success: false,
        error: "El archivo no puede superar los 10 MB",
        code: "VALIDATION_ERROR",
      };
    }

    const tempId = randomUUID();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    storagePath = `${tempId}/${timestamp}_${safeName}`;

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await adminSupabase.storage
      .from("referee-certificates")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "[submitRefereeRegistrationAction] Storage upload error:",
        uploadError,
      );
      return {
        success: false,
        error: "Error al subir el certificado. Por favor intenta nuevamente.",
        code: "INTERNAL_ERROR",
      };
    }
  }

  // 3. Execute use case (composition root)
  try {
    const repo = new SupabaseRefereeRegistrationRepository();
    const result = await submitRefereeRegistration(
      { ...textParsed.data, certificatePath: storagePath },
      { repo },
    );
    return { success: true, data: result };
  } catch (err) {
    // Clean up the uploaded file if registration fails
    if (storagePath) {
      await adminSupabase.storage
        .from("referee-certificates")
        .remove([storagePath]);
    }

    if (err instanceof DuplicateRefereeEmailError) {
      return {
        success: false,
        error: "Ya existe un registro con este email",
        code: "CONFLICT",
      };
    }
    if (err instanceof DuplicateRegistrationNumberError) {
      return {
        success: false,
        error: "Ya existe un registro con este número de registro oficial",
        code: "CONFLICT",
      };
    }
    console.error("[submitRefereeRegistrationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// Authenticated action — referee downloads their own certificate
// ---------------------------------------------------------------------------

/**
 * Generates a signed URL for the authenticated referee's own certificate.
 * Verifies ownership: the certificate must belong to the calling user.
 * Validates: Requisitos 9.1–9.3
 */
export async function getRefereeOwnCertificateUrlAction(): Promise<
  ActionResult<{ url: string }>
> {
  // 1. Authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  // 2. Fetch the registration linked to this auth user
  const repo = new SupabaseRefereeRegistrationRepository();
  let registration;
  try {
    registration = await getRefereeProfile(user.id, { repo });
  } catch {
    return {
      success: false,
      error: "No se encontró tu registro de árbitro",
      code: "NOT_FOUND",
    };
  }

  // 3. Verify a certificate was uploaded
  if (!registration.certificatePath) {
    return {
      success: false,
      error: "No tienes un certificado subido",
      code: "NOT_FOUND",
    };
  }

  // 4. Generate signed URL (1 hour expiry)
  const { data, error } = await adminSupabase.storage
    .from("referee-certificates")
    .createSignedUrl(registration.certificatePath, 3600);

  if (error || !data?.signedUrl) {
    console.error("[getRefereeOwnCertificateUrlAction] Storage error:", error);
    return {
      success: false,
      error: "No se pudo generar el enlace del certificado",
      code: "INTERNAL_ERROR",
    };
  }

  return { success: true, data: { url: data.signedUrl } };
}
