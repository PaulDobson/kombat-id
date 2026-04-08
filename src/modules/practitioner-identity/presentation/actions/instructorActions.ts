"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleCertificationRepository } from "../../infrastructure/repositories/drizzleCertificationRepository";
import {
  registerPractitioner,
  RegisterPractitionerInputSchema,
} from "../../application/use-cases/registerPractitioner";
import {
  issueCertification,
  type IssueCertificationInput,
} from "../../application/use-cases/issueCertification";
import {
  DuplicateRutError,
  PractitionerNotFoundError,
  UnauthorizedError,
} from "../../domain/errors";
import { DomainError } from "@/lib/errors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"] as const;

const RegisterStudentInputSchema = RegisterPractitionerInputSchema.omit({
  instructorId: true,
});

export type RegisterStudentInput = z.infer<typeof RegisterStudentInputSchema>;

// ── Certification request schemas ────────────────────────────────────────────

const RequestCertificationInputSchema = z.object({
  practitionerId: z.string().uuid(),
  certType: z.enum([
    "technical_grade",
    "instructor",
    "referee",
    "coach",
    "event_participation",
  ]),
  notes: z.string().optional(),
});

const ApproveCertificationRequestInputSchema = z.object({
  requestId: z.string().uuid(),
});

const RejectCertificationRequestInputSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().optional(),
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

// ── requestCertificationAction ────────────────────────────────────────────────

export async function requestCertificationAction(
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

  // 2. Authorization — verify instructor role
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!practitioner) {
    return {
      success: false,
      error: "No se encontró un perfil de practicante activo",
      code: "FORBIDDEN",
    };
  }

  if (
    !INSTRUCTOR_ROLES.includes(
      practitioner.role as (typeof INSTRUCTOR_ROLES)[number],
    )
  ) {
    return {
      success: false,
      error:
        "Solo instructores, profesores o maestros pueden solicitar certificaciones",
      code: "FORBIDDEN",
    };
  }

  // 3. Input validation
  const parsed = RequestCertificationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 4. Insert certification request
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from("certification_requests")
      .insert({
        id: crypto.randomUUID(),
        requester_id: practitioner.id as string,
        practitioner_id: parsed.data.practitionerId,
        cert_type: parsed.data.certType,
        notes: parsed.data.notes ?? null,
        status: "pending",
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[requestCertificationAction] DB error:", error);
      return {
        success: false,
        error: "Error al guardar la solicitud",
        code: "INTERNAL_ERROR",
      };
    }

    revalidatePath("/instructor");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[requestCertificationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
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

// ── registerStudentAction ─────────────────────────────────────────────────────

export async function registerStudentAction(
  rawInput: unknown,
): Promise<ActionResult<{ publicId: string }>> {
  // 1. Authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  // 2. Authorization — verify the user has an instructor practitioner profile
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!practitioner) {
    return {
      success: false,
      error: "No se encontró un perfil de practicante activo",
      code: "FORBIDDEN",
    };
  }

  if (
    !INSTRUCTOR_ROLES.includes(
      practitioner.role as (typeof INSTRUCTOR_ROLES)[number],
    )
  ) {
    return {
      success: false,
      error:
        "Solo instructores, profesores o maestros pueden registrar alumnos",
      code: "FORBIDDEN",
    };
  }

  // 3. Input validation
  const parsed = RegisterStudentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 4. Execute use case with instructorId set to the logged-in instructor
  try {
    const practitionerRepo = new DrizzlePractitionerRepository();
    const result = await registerPractitioner(
      { ...parsed.data, instructorId: practitioner.id as string },
      { practitionerRepo },
    );

    revalidatePath("/instructor");
    return { success: true, data: { publicId: result.publicId } };
  } catch (err) {
    if (err instanceof DuplicateRutError) {
      return {
        success: false,
        error: "Ya existe un practicante con ese RUT",
        code: "DUPLICATE_RUT",
      };
    }
    console.error("[registerStudentAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
