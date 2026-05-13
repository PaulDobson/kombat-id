"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { assignSystemRole } from "@/lib/roles";
import { SupabaseRefereeRegistrationRepository } from "../../infrastructure/repositories/supabaseRefereeRegistrationRepository";
import { SupabaseRefereePortalPublicationRepository } from "../../infrastructure/repositories/supabaseRefereePortalPublicationRepository";
import { approveRefereeRegistration } from "../../application/use-cases/approveRefereeRegistration";
import { rejectRefereeRegistration } from "../../application/use-cases/rejectRefereeRegistration";
import { updateRefereeRegistration } from "../../application/use-cases/updateRefereeRegistration";
import { getRefereeRegistrationById } from "../../application/use-cases/getRefereeRegistrationById";
import { createPortalPublication } from "../../application/use-cases/createPortalPublication";
import { updatePortalPublication } from "../../application/use-cases/updatePortalPublication";
import { deletePortalPublication } from "../../application/use-cases/deletePortalPublication";
import {
  RefereeRegistrationNotFoundError,
  InvalidStatusTransitionError,
  AuthUserCreationError,
  PortalPublicationNotFoundError,
} from "../../domain/errors";
import type { RefereeAuthService } from "../../application/use-cases/approveRefereeRegistration";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---------------------------------------------------------------------------
// Auth helper — same pattern as the rest of the project
// Validates: Propiedad 10 — Autorización en Server Actions
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
// RefereeAuthService implementation (infrastructure, lives here as composition root)
// Validates: Propiedad 7 — Aprobación activa la cuenta — nunca antes
// Validates: Propiedad 8 — Idempotencia de la provisión de cuenta
// ---------------------------------------------------------------------------

const refereeAuthService: RefereeAuthService = {
  async inviteRefereeUser(email: string): Promise<{ authUserId: string }> {
    // Check if user already exists — idempotent
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);

    if (existing) {
      // Assign referee role if not already set
      const currentRole = existing.app_metadata?.role as string | undefined;
      if (currentRole !== "referee") {
        const { error } = await adminSupabase.auth.admin.updateUserById(
          existing.id,
          { app_metadata: { ...existing.app_metadata, role: "referee" } },
        );
        if (error) {
          throw new Error(
            `Failed to assign referee role to existing user: ${error.message}`,
          );
        }
      }
      // Sincronizar en tabla user_roles (idempotente)
      await assignSystemRole(existing.id, "referee", null, adminSupabase);
      return { authUserId: existing.id };
    }

    // Create the user with email_confirm: true so no SMTP is required.
    // A random temporary password is set — the referee must use
    // "forgot password" to set their own password on first login.
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: { role: "referee" },
    });

    if (error || !data?.user) {
      throw new Error(error?.message ?? "Unknown error creating auth user");
    }

    // Sincronizar en tabla user_roles
    await assignSystemRole(data.user.id, "referee", null, adminSupabase);

    return { authUserId: data.user.id };
  },
};

// ---------------------------------------------------------------------------
// Revalidation paths
// ---------------------------------------------------------------------------

const REGISTRATIONS_PATH = "/admin/referee-registrations";
const PUBLICATIONS_PATH = "/admin/referee-registrations/publications";

// ---------------------------------------------------------------------------
// Registration management actions
// ---------------------------------------------------------------------------

/**
 * Approves a pending referee registration and provisions the Auth account.
 * Validates: Requisitos 4.1–4.6, 10.1
 */
export async function approveRefereeRegistrationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  const parsed = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseRefereeRegistrationRepository();
    await approveRefereeRegistration(
      { id: parsed.data.id, adminId: admin.userId },
      { repo, authService: refereeAuthService },
    );
    revalidatePath(REGISTRATIONS_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof RefereeRegistrationNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    if (err instanceof InvalidStatusTransitionError) {
      return { success: false, error: err.message, code: "CONFLICT" };
    }
    if (err instanceof AuthUserCreationError) {
      console.error("[approveRefereeRegistrationAction] Auth error:", err);
      return {
        success: false,
        error: "Error al crear la cuenta del árbitro",
        code: "INTERNAL_ERROR",
      };
    }
    console.error("[approveRefereeRegistrationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Rejects a pending referee registration.
 * Validates: Requisitos 5.1–5.2, 10.1
 */
export async function rejectRefereeRegistrationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  const parsed = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseRefereeRegistrationRepository();
    await rejectRefereeRegistration(
      { id: parsed.data.id, adminId: admin.userId },
      { repo },
    );
    revalidatePath(REGISTRATIONS_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof RefereeRegistrationNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    if (err instanceof InvalidStatusTransitionError) {
      return { success: false, error: err.message, code: "CONFLICT" };
    }
    console.error("[rejectRefereeRegistrationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Updates editable fields of a referee registration.
 * Validates: Requisitos 6.1–6.4, 10.1
 */
export async function updateRefereeRegistrationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  const parsed = z
    .object({
      id: z.string().uuid(),
      fullName: z.string().min(2).max(200),
      country: z.string().min(1).max(100),
      registrationNumber: z.string().min(1).max(100),
    })
    .safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseRefereeRegistrationRepository();
    await updateRefereeRegistration(parsed.data, { repo });
    revalidatePath(REGISTRATIONS_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof RefereeRegistrationNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    console.error("[updateRefereeRegistrationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Generates a signed URL for a referee's certificate PDF.
 * Validates: Requisitos 9.1–9.3, 10.5
 */
export async function getSignedCertificateUrlAction(
  rawInput: unknown,
): Promise<ActionResult<{ url: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  const parsed = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseRefereeRegistrationRepository();
    const registration = await getRefereeRegistrationById(parsed.data.id, {
      repo,
    });

    if (!registration.certificatePath) {
      return {
        success: false,
        error: "Este árbitro no tiene certificado adjunto",
        code: "NOT_FOUND",
      };
    }

    const { data, error } = await adminSupabase.storage
      .from("referee-certificates")
      .createSignedUrl(registration.certificatePath, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      console.error("[getSignedCertificateUrlAction] Storage error:", error);
      return {
        success: false,
        error: "No se pudo generar el enlace del certificado",
        code: "INTERNAL_ERROR",
      };
    }

    return { success: true, data: { url: data.signedUrl } };
  } catch (err) {
    if (err instanceof RefereeRegistrationNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    console.error("[getSignedCertificateUrlAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const COVER_IMAGE_BUCKET = "referee-portal-images";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function mimeToExt(mime: string): string | null {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mime] ?? null;
}

// ---------------------------------------------------------------------------
// Portal publication management actions
// ---------------------------------------------------------------------------

/**
 * Creates a new portal publication, optionally with a cover image.
 * Validates: Requisitos 8.1–8.3, 1.1–1.5, 10.1
 */
export async function createPortalPublicationAction(
  rawInput: FormData,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  // Extract and validate text fields
  const parsed = z
    .object({
      title: z.string().min(1).max(300),
      body: z.string().min(1),
      category: z.enum(["news", "regulation", "championship"]),
      publishedAt: z.string().optional(),
      isEvent: z
        .string()
        .optional()
        .transform((v) => v === "true"),
      eventDate: z.string().optional().nullable(),
      eventLocation: z.string().optional().nullable(),
      maxParticipants: z
        .string()
        .optional()
        .nullable()
        .transform((v) => (v ? parseInt(v, 10) : null))
        .refine(
          (v) => v === null || (Number.isInteger(v) && v > 0),
          "El cupo máximo debe ser un entero positivo",
        ),
      registrationDeadline: z.string().optional().nullable(),
    })
    .safeParse({
      title: rawInput.get("title"),
      body: rawInput.get("body"),
      category: rawInput.get("category"),
      publishedAt: rawInput.get("publishedAt") ?? undefined,
      isEvent: rawInput.get("isEvent") ?? undefined,
      eventDate: rawInput.get("eventDate") ?? null,
      eventLocation: rawInput.get("eventLocation") ?? null,
      maxParticipants: rawInput.get("maxParticipants") ?? null,
      registrationDeadline: rawInput.get("registrationDeadline") ?? null,
    });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  // Handle optional cover image upload
  let coverImagePath: string | null = null;
  const coverImageFile = rawInput.get("coverImage");

  if (coverImageFile instanceof File && coverImageFile.size > 0) {
    // Validate MIME type
    if (
      !(ALLOWED_MIME_TYPES as readonly string[]).includes(coverImageFile.type)
    ) {
      return {
        success: false,
        error:
          "Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG o WebP.",
        code: "VALIDATION_ERROR",
      };
    }

    // Validate size
    if (coverImageFile.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        success: false,
        error: "La imagen no puede superar los 5 MB.",
        code: "VALIDATION_ERROR",
      };
    }

    const ext = mimeToExt(coverImageFile.type)!;
    const publicationId = randomUUID();
    const storagePath = `${publicationId}/cover.${ext}`;

    const fileBuffer = await coverImageFile.arrayBuffer();
    const { error: uploadError } = await adminSupabase.storage
      .from(COVER_IMAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: coverImageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "[createPortalPublicationAction] Storage upload error:",
        uploadError,
      );
      return {
        success: false,
        error: "Error al subir la imagen. Por favor intenta nuevamente.",
        code: "STORAGE_ERROR",
      };
    }

    coverImagePath = storagePath;

    // Use the pre-generated ID so the storage path and DB record are consistent
    try {
      const repo = new SupabaseRefereePortalPublicationRepository();
      const result = await createPortalPublication(
        {
          ...parsed.data,
          createdBy: admin.userId,
          coverImagePath,
          id: publicationId,
        },
        { repo },
      );
      revalidatePath(PUBLICATIONS_PATH);
      return { success: true, data: result };
    } catch (err) {
      console.error("[createPortalPublicationAction] Unexpected error:", err);
      return {
        success: false,
        error: "Error interno del servidor",
        code: "INTERNAL_ERROR",
      };
    }
  }

  // No image — proceed without upload
  try {
    const repo = new SupabaseRefereePortalPublicationRepository();
    const result = await createPortalPublication(
      { ...parsed.data, createdBy: admin.userId, coverImagePath: null },
      { repo },
    );
    revalidatePath(PUBLICATIONS_PATH);
    return { success: true, data: result };
  } catch (err) {
    console.error("[createPortalPublicationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Updates an existing portal publication, optionally replacing the cover image.
 * Validates: Requisito 8.4, 1.6, 1.7, 10.1
 */
export async function updatePortalPublicationAction(
  rawInput: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  const parsed = z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1).max(300),
      body: z.string().min(1),
      category: z.enum(["news", "regulation", "championship"]),
      isEvent: z
        .string()
        .optional()
        .transform((v) => v === "true"),
      eventDate: z.string().optional().nullable(),
      eventLocation: z.string().optional().nullable(),
      maxParticipants: z
        .string()
        .optional()
        .nullable()
        .transform((v) => (v ? parseInt(v, 10) : null))
        .refine(
          (v) => v === null || (Number.isInteger(v) && v > 0),
          "El cupo máximo debe ser un entero positivo",
        ),
      registrationDeadline: z.string().optional().nullable(),
    })
    .safeParse({
      id: rawInput.get("id"),
      title: rawInput.get("title"),
      body: rawInput.get("body"),
      category: rawInput.get("category"),
      isEvent: rawInput.get("isEvent") ?? undefined,
      eventDate: rawInput.get("eventDate") ?? null,
      eventLocation: rawInput.get("eventLocation") ?? null,
      maxParticipants: rawInput.get("maxParticipants") ?? null,
      registrationDeadline: rawInput.get("registrationDeadline") ?? null,
    });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  // Handle optional new cover image
  let newCoverImagePath: string | null | undefined = undefined; // undefined = keep existing
  const coverImageFile = rawInput.get("coverImage");

  if (coverImageFile instanceof File && coverImageFile.size > 0) {
    // Validate MIME type
    if (
      !(ALLOWED_MIME_TYPES as readonly string[]).includes(coverImageFile.type)
    ) {
      return {
        success: false,
        error:
          "Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG o WebP.",
        code: "VALIDATION_ERROR",
      };
    }

    // Validate size
    if (coverImageFile.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        success: false,
        error: "La imagen no puede superar los 5 MB.",
        code: "VALIDATION_ERROR",
      };
    }

    const ext = mimeToExt(coverImageFile.type)!;
    const storagePath = `${parsed.data.id}/cover.${ext}`;

    // Fetch existing publication to find old image path
    const repo = new SupabaseRefereePortalPublicationRepository();
    let oldCoverImagePath: string | null = null;
    try {
      const existing = await repo.findById(parsed.data.id);
      if (!existing) {
        return {
          success: false,
          error: `Portal publication not found: ${parsed.data.id}`,
          code: "NOT_FOUND",
        };
      }
      oldCoverImagePath = existing.coverImagePath;
    } catch (err) {
      console.error(
        "[updatePortalPublicationAction] Error fetching existing publication:",
        err,
      );
      return {
        success: false,
        error: "Error interno del servidor",
        code: "INTERNAL_ERROR",
      };
    }

    // Upload new image
    const fileBuffer = await coverImageFile.arrayBuffer();
    const { error: uploadError } = await adminSupabase.storage
      .from(COVER_IMAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: coverImageFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error(
        "[updatePortalPublicationAction] Storage upload error:",
        uploadError,
      );
      return {
        success: false,
        error: "Error al subir la imagen. Por favor intenta nuevamente.",
        code: "STORAGE_ERROR",
      };
    }

    newCoverImagePath = storagePath;

    // Delete old image (best effort)
    if (oldCoverImagePath && oldCoverImagePath !== storagePath) {
      const { error: deleteError } = await adminSupabase.storage
        .from(COVER_IMAGE_BUCKET)
        .remove([oldCoverImagePath as string]);
      if (deleteError) {
        console.error(
          "[updatePortalPublicationAction] Failed to delete old cover image:",
          deleteError,
        );
      }
    }
  }

  try {
    const repo = new SupabaseRefereePortalPublicationRepository();
    await updatePortalPublication(
      { ...parsed.data, coverImagePath: newCoverImagePath },
      { repo },
    );
    revalidatePath(PUBLICATIONS_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PortalPublicationNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    console.error("[updatePortalPublicationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Deletes a portal publication and its cover image from Storage.
 * Validates: Requisito 8.5, 1.9, 1.10, 10.1
 */
export async function deletePortalPublicationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  const parsed = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseRefereePortalPublicationRepository();
    const storageService = {
      async deleteFile(path: string): Promise<void> {
        const { error } = await adminSupabase.storage
          .from(COVER_IMAGE_BUCKET)
          .remove([path]);
        if (error) throw new Error(error.message);
      },
    };
    await deletePortalPublication(parsed.data.id, { repo, storageService });
    revalidatePath(PUBLICATIONS_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PortalPublicationNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    console.error("[deletePortalPublicationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
