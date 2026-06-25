"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createPractitionerIdentityAdminClient,
  createPractitionerRepo,
} from "./_practitionerIdentityDeps";
import {
  registerPractitioner,
  RegisterPractitionerInputSchema,
} from "../../application/use-cases/registerPractitioner";
import {
  DuplicateRutError,
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";
import {
  updateStudentProfile,
  UpdateStudentProfileInputSchema,
} from "../../application/use-cases/updateStudentProfile";
import { verifyInstructorStudentAccess } from "../../application/use-cases/verifyInstructorStudentAccess";
import { resolveStudentAuthAccount } from "../../application/use-cases/resolveStudentAuthAccount";
import { requireInstructorPractitioner } from "./_requireInstructorPractitioner";
import { notifyAdminsNewStudent } from "@/modules/notifications/presentation/actions/notificationHelpers";
import type { ActionResult } from "@/lib/types";

// ── Schemas ───────────────────────────────────────────────────────────────────

const RegisterStudentInputSchema = RegisterPractitionerInputSchema.omit({
  instructorId: true,
  authUserId: true,
  role: true,
}).extend({
  // Optional: if provided, the system will look up the auth account by email
  // and link it to the practitioner profile automatically.
  studentEmail: z.string().email().optional().or(z.literal("")),
  // Optional: assign the student directly to this academy instead of the first one.
  academyId: z.string().uuid().optional(),
});

export type RegisterStudentInput = z.infer<typeof RegisterStudentInputSchema>;

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

// ── requestCertificationAction ────────────────────────────────────────────────

export async function requestCertificationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // 1. Authentication + Authorization
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Input validation
  const parsed = RequestCertificationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 3. Insert certification request
  const supabase = createPractitionerIdentityAdminClient();
  try {
    const { error } = await supabase.from("certification_requests").insert({
      id: crypto.randomUUID(),
      requester_id: auth.practitioner.id,
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

// ── registerStudentAction ─────────────────────────────────────────────────────

export async function registerStudentAction(
  rawInput: unknown,
): Promise<ActionResult<{ publicId: string }>> {
  // 1. Authentication + Authorization
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Input validation
  const parsed = RegisterStudentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  const studentEmail = parsed.data.studentEmail?.trim() || undefined;
  const targetAcademyId = parsed.data.academyId;
  const instructorId = auth.practitioner.id;

  try {
    // 3. Resolve auth account and instructor's academy in parallel
    const [authAccountResult, academyResult] = await Promise.all([
      studentEmail
        ? resolveStudentAuthAccount(studentEmail)
        : Promise.resolve({ authUserId: undefined }),
      resolveAcademyForInstructor(instructorId, targetAcademyId),
    ]);

    // 4. Register practitioner
    const practitionerRepo = createPractitionerRepo();
    const result = await registerPractitioner(
      {
        ...parsed.data,
        role: "alumno",
        contactEmail: studentEmail ?? undefined,
        instructorId,
        authUserId: authAccountResult.authUserId,
      },
      { practitionerRepo },
    );

    // 5. Students registered by instructors start as INACTIVE — they require
    //    admin membership verification before being activated.
    //    Assign academy membership in parallel.
    const supabase = createPractitionerIdentityAdminClient();
    await Promise.all([
      supabase
        .from("practitioners")
        .update({ is_active: false })
        .eq("id", result.publicId),
      academyResult.academyId
        ? supabase.from("academy_memberships").insert({
            id: crypto.randomUUID(),
            academy_id: academyResult.academyId,
            practitioner_id: result.publicId,
            is_active: true,
            joined_at: new Date().toISOString(),
          })
        : Promise.resolve(),
    ]);

    revalidatePath("/instructor");
    if (targetAcademyId) {
      revalidatePath(`/instructor/academies/${targetAcademyId}`);
    }

    // 6. Notificar a los administradores del nuevo alumno pendiente
    try {
      // Obtener el auth_user_id y nombre del instructor para la notificación
      const { data: instructorData } = await supabase
        .from("practitioners")
        .select("auth_user_id, full_name")
        .eq("id", auth.practitioner.id)
        .single();

      if (instructorData?.auth_user_id) {
        await notifyAdminsNewStudent({
          studentId: result.publicId,
          studentName: parsed.data.fullName,
          studentRut: parsed.data.rut,
          instructorId: instructorData.auth_user_id,
          instructorName: instructorData.full_name,
        });
      }
    } catch (notifErr) {
      // No bloquear el registro si falla la notificación
      console.error(
        "[registerStudentAction] Failed to send notification:",
        notifErr,
      );
    }

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

// ── updateStudentProfileAction ────────────────────────────────────────────────

export async function updateStudentProfileAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // 1. Authentication + Authorization
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Input validation
  const parsed = UpdateStudentProfileInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  const { publicId } = parsed.data;

  // 3. Verify the student belongs to this instructor (direct or via academy)
  const hasAccess = await verifyInstructorStudentAccess({
    instructorId: auth.practitioner.id,
    studentId: publicId,
  });

  if (!hasAccess) {
    return {
      success: false,
      error: "No tienes permiso para editar este alumno",
      code: "FORBIDDEN",
    };
  }

  // 4. Execute use case
  try {
    const practitionerRepo = createPractitionerRepo();
    await updateStudentProfile(parsed.data, { practitionerRepo });

    revalidatePath(`/instructor/students/${publicId}`);
    revalidatePath(`/instructor/students/${publicId}/edit`);

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Alumno no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof PractitionerInactiveError) {
      return {
        success: false,
        error: "El alumno está inactivo",
        code: "FORBIDDEN",
      };
    }
    console.error("[updateStudentProfileAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Resolves which academy to assign a new student to.
 *
 * If a targetAcademyId is provided, verifies the instructor is responsible for
 * it. Otherwise, falls back to the instructor's first active academy.
 */
async function resolveAcademyForInstructor(
  instructorId: string,
  targetAcademyId: string | undefined,
): Promise<{ academyId: string | undefined }> {
  const supabase = createPractitionerIdentityAdminClient();
  if (targetAcademyId) {
    const { data } = await supabase
      .from("academies")
      .select("id")
      .eq("id", targetAcademyId)
      .contains("responsible_instructor_ids", [instructorId])
      .eq("is_active", true)
      .maybeSingle();

    return { academyId: data?.id ?? undefined };
  }

  const { data } = await supabase
    .from("academies")
    .select("id")
    .contains("responsible_instructor_ids", [instructorId])
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  return { academyId: data?.[0]?.id ?? undefined };
}
