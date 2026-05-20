"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleCertificationRepository } from "../../infrastructure/repositories/drizzleCertificationRepository";
import {
  issueCertification,
  type IssueCertificationInput,
} from "../../application/use-cases/issueCertification";
import {
  PractitionerNotFoundError,
  UnauthorizedError,
} from "../../domain/errors";
import { DomainError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types";

// ── Certification request schemas ────────────────────────────────────────────

const ApproveCertificationRequestInputSchema = z.object({
  requestId: z.string().uuid(),
});

const RejectCertificationRequestInputSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().optional(),
});

const ObserveCertificationRequestInputSchema = z.object({
  requestId: z.string().uuid(),
  observationNotes: z.string().min(1),
});

// ── Helper: require admin ─────────────────────────────────────────────────────

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

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data !== null;
}

// ── approveCertificationRequestAction ────────────────────────────────────────

export async function approveCertificationRequestAction(
  rawInput: unknown,
): Promise<ActionResult<{ certId: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = ApproveCertificationRequestInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    // Fetch the request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: request, error: fetchError } = await (adminSupabase as any)
      .from("certification_requests")
      .select("*")
      .eq("id", parsed.data.requestId)
      .maybeSingle();

    if (fetchError || !request) {
      return {
        success: false,
        error: "Solicitud no encontrada",
        code: "NOT_FOUND",
      };
    }

    // Issue the certification via existing use case
    const practitionerRepo = new DrizzlePractitionerRepository();
    const certificationRepo = new DrizzleCertificationRepository();

    const result = await issueCertification(
      {
        practitionerId: request.practitioner_id as string,
        certType: request.cert_type as IssueCertificationInput["certType"],
        issuedBy: admin.userId,
        notes: request.notes as string | null,
      },
      { practitionerRepo, certificationRepo, isAdmin },
    );

    // Update request status to approved
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
      .from("certification_requests")
      .update({ status: "approved" })
      .eq("id", parsed.data.requestId);

    revalidatePath("/admin/certification-requests");
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message, code: "DOMAIN_ERROR" };
    }
    console.error("[approveCertificationRequestAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ── rejectCertificationRequestAction ─────────────────────────────────────────

export async function rejectCertificationRequestAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = RejectCertificationRequestInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from("certification_requests")
      .update({
        status: "rejected",
        rejection_reason: parsed.data.reason ?? null,
      })
      .eq("id", parsed.data.requestId);

    if (error) {
      console.error("[rejectCertificationRequestAction] DB error:", error);
      return {
        success: false,
        error: "Error al actualizar la solicitud",
        code: "INTERNAL_ERROR",
      };
    }

    revalidatePath("/admin/certification-requests");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[rejectCertificationRequestAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ── observeCertificationRequestAction ────────────────────────────────────────

export async function observeCertificationRequestAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = ObserveCertificationRequestInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from("certification_requests")
      .update({
        status: "observed",
        observation_notes: parsed.data.observationNotes,
      })
      .eq("id", parsed.data.requestId);

    if (error) {
      console.error("[observeCertificationRequestAction] DB error:", error);
      return {
        success: false,
        error: "Error al actualizar la solicitud",
        code: "INTERNAL_ERROR",
      };
    }

    revalidatePath("/admin/certification-requests");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[observeCertificationRequestAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
