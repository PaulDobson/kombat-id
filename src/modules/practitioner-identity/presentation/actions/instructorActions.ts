"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import {
  registerPractitioner,
  RegisterPractitionerInputSchema,
} from "../../application/use-cases/registerPractitioner";
import {
  DuplicateRutError,
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";
import { INSTRUCTOR_ROLES } from "@/lib/roles";
import {
  updateStudentProfile,
  UpdateStudentProfileInputSchema,
} from "../../application/use-cases/updateStudentProfile";
import { verifyInstructorStudentAccess } from "../../application/use-cases/verifyInstructorStudentAccess";
import type { ActionResult } from "@/lib/types";

const RegisterStudentInputSchema = RegisterPractitionerInputSchema.omit({
  instructorId: true,
  authUserId: true,
}).extend({
  // Optional: if provided, the system will look up the auth account by email
  // and link it to the practitioner profile automatically.
  studentEmail: z.string().email().optional().or(z.literal("")),
  // Optional: assign the student directly to this academy instead of the first one.
  academyId: z.string().uuid().optional(),
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

    // Resolve authUserId from studentEmail if provided
    let authUserId: string | undefined;
    const studentEmail = parsed.data.studentEmail?.trim();
    if (studentEmail) {
      const { data: authList } = await adminSupabase.auth.admin.listUsers({
        perPage: 1000,
      });
      const match = authList?.users?.find(
        (u) => u.email?.toLowerCase() === studentEmail.toLowerCase(),
      );
      if (match) {
        authUserId = match.id;
      }
    }

    const result = await registerPractitioner(
      {
        ...parsed.data,
        // Store email as contactEmail so auto-linking works if account is created later
        contactEmail: studentEmail ?? undefined,
        instructorId: practitioner.id as string,
        authUserId,
      },
      { practitionerRepo },
    );

    // Students registered by instructors start as INACTIVE — they require
    // admin membership verification before being activated.
    await adminSupabase
      .from("practitioners")
      .update({ is_active: false })
      .eq("id", result.publicId);

    // Assign the new student to the specified academy, or fall back to the
    // instructor's first active academy.
    const targetAcademyId = parsed.data.academyId;

    let academyToAssign: string | undefined;
    if (targetAcademyId) {
      // Verify the instructor is responsible for the given academy
      const { data: verifiedAcademy } = await adminSupabase
        .from("academies")
        .select("id")
        .eq("id", targetAcademyId)
        .contains("responsible_instructor_ids", [practitioner.id as string])
        .eq("is_active", true)
        .maybeSingle();
      if (verifiedAcademy) academyToAssign = verifiedAcademy.id as string;
    } else {
      const { data: instructorAcademies } = await adminSupabase
        .from("academies")
        .select("id")
        .contains("responsible_instructor_ids", [practitioner.id as string])
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);
      academyToAssign = instructorAcademies?.[0]?.id as string | undefined;
    }

    if (academyToAssign) {
      await adminSupabase.from("academy_memberships").insert({
        id: crypto.randomUUID(),
        academy_id: academyToAssign,
        practitioner_id: result.publicId,
        is_active: true,
        joined_at: new Date().toISOString(),
      });
    }

    revalidatePath("/instructor");
    if (targetAcademyId)
      revalidatePath(`/instructor/academies/${targetAcademyId}`);
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
  // 1. Authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado", code: "FORBIDDEN" };
  }

  // 2. Verify instructor role
  const { data: instructor } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (
    !instructor ||
    !INSTRUCTOR_ROLES.includes(
      instructor.role as (typeof INSTRUCTOR_ROLES)[number],
    )
  ) {
    return {
      success: false,
      error: "Solo instructores, profesores o maestros pueden editar alumnos",
      code: "FORBIDDEN",
    };
  }

  // 3. Validate input
  const parsed = UpdateStudentProfileInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  const { publicId } = parsed.data;

  // 4. Verify the student belongs to this instructor (direct or via academy)
  const hasAccess = await verifyInstructorStudentAccess({
    instructorId: instructor.id as string,
    studentId: publicId,
  });

  if (!hasAccess) {
    return {
      success: false,
      error: "No tienes permiso para editar este alumno",
      code: "FORBIDDEN",
    };
  }

  // 5. Execute use case
  try {
    const practitionerRepo = new DrizzlePractitionerRepository();
    await updateStudentProfile(parsed.data, { practitionerRepo });

    // 6. Revalidate
    revalidatePath(`/instructor/students/${publicId}`);
    revalidatePath(`/instructor/students/${publicId}/edit`);

    // 7. Return success
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
