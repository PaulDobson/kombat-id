"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireInstructorPractitioner } from "@/modules/practitioner-identity/presentation/actions/_requireInstructorPractitioner";
import { markStepComplete } from "../../application/use-cases/markStepComplete";
import { SupabaseOnboardingProgressRepository } from "../../infrastructure/repositories/supabaseOnboardingProgressRepository";
import { sendStudentWelcomeEmail } from "@/lib/email";
import { adminSupabase } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import type { OnboardingProgress } from "../../domain/entities/onboardingProgress";
import { ONBOARDING_STEP_KEYS } from "../../domain/entities/onboardingProgress";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const AcademyBasicDataSchema = z.object({
  name: z.string().min(1).max(120),
  region: z.enum([
    "arica_y_parinacota",
    "tarapaca",
    "antofagasta",
    "atacama",
    "coquimbo",
    "valparaiso",
    "metropolitana",
    "ohiggins",
    "maule",
    "nuble",
    "biobio",
    "araucania",
    "los_rios",
    "los_lagos",
    "aysen",
    "magallanes",
  ]),
  city: z.string().min(1).max(80),
  address: z.string().max(200).optional(),
  foundedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const e164OrChile = z
  .string()
  .regex(/^(\+?[1-9]\d{1,14}|(\+56|56)?[\s.-]?(9\d{8}|\d{9}))$/)
  .optional()
  .or(z.literal(""));

const AcademyPublicProfileSchema = z.object({
  description: z.string().max(1000).optional(),
  founderStory: z.string().max(2000).optional(),
  contactPhone: e164OrChile,
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactInstagram: z.string().max(100).optional(),
  contactWhatsapp: e164OrChile,
  contactWebsite: z.string().url().optional().or(z.literal("")),
  coverImagePath: z.string().optional(),
});

const RegisterStudentSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => new Date(d) < new Date(), {
      message: "La fecha debe ser pasada",
    }),
  belt: z.enum(["white", "yellow", "green", "blue", "red", "black"]).optional(),
  academyId: z.string().uuid(),
});

const SessionStudentSchema = z.object({
  practitionerId: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  temporaryPassword: z.string(),
});

export type SessionStudent = z.infer<typeof SessionStudentSchema>;

// ---------------------------------------------------------------------------
// OnboardingProgressDTO — serialisable shape returned from markStepCompleteAction
// ---------------------------------------------------------------------------

export interface OnboardingProgressDTO {
  stepCreateAcademyCompleted: boolean;
  stepRegisterStudentsCompleted: boolean;
  stepWelcomeEmailsCompleted: boolean;
  stepEventsInfoCompleted: boolean;
  completedAt: string | null;
}

function toProgressDTO(progress: OnboardingProgress): OnboardingProgressDTO {
  return {
    stepCreateAcademyCompleted: progress.stepCreateAcademyCompleted,
    stepRegisterStudentsCompleted: progress.stepRegisterStudentsCompleted,
    stepWelcomeEmailsCompleted: progress.stepWelcomeEmailsCompleted,
    stepEventsInfoCompleted: progress.stepEventsInfoCompleted,
    completedAt: progress.completedAt,
  };
}

// ---------------------------------------------------------------------------
// 1. createAcademyAndCompleteStepAction
// ---------------------------------------------------------------------------

export async function createAcademyAndCompleteStepAction(
  rawBasicData: unknown,
  rawProfileData: unknown,
): Promise<ActionResult<{ academyId: string }>> {
  // 1. Authentication
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Validation
  const basicParsed = AcademyBasicDataSchema.safeParse(rawBasicData);
  if (!basicParsed.success) {
    return {
      success: false,
      error: basicParsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  const profileParsed = AcademyPublicProfileSchema.safeParse(rawProfileData);
  if (!profileParsed.success) {
    return {
      success: false,
      error: profileParsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 3. Execute
  try {
    const combined = { ...basicParsed.data, ...profileParsed.data };
    const academyId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: insertError } = await adminSupabase
      .from("academies")
      .insert({
        id: academyId,
        name: combined.name,
        region: combined.region,
        city: combined.city,
        address: combined.address ?? null,
        founded_date: combined.foundedDate ?? null,
        responsible_instructor_ids: [auth.practitioner.id],
        is_active: true,
        created_by: auth.practitioner.id,
        description: combined.description ?? null,
        founder_story: combined.founderStory ?? null,
        contact_phone: combined.contactPhone ?? null,
        contact_email: combined.contactEmail ?? null,
        contact_instagram: combined.contactInstagram ?? null,
        contact_whatsapp: combined.contactWhatsapp ?? null,
        contact_website: combined.contactWebsite ?? null,
        cover_image_path: combined.coverImagePath ?? null,
        deactivated_at: null,
        deactivation_reason: null,
        updated_at: now,
        created_at: now,
      } as never);

    if (insertError) {
      console.error(
        "[createAcademyAndCompleteStepAction] DB insert error:",
        insertError,
      );
      return {
        success: false,
        error: "Error al crear la academia",
        code: "INTERNAL_ERROR",
      };
    }

    // 4. Mark step complete
    const repo = new SupabaseOnboardingProgressRepository();
    await markStepComplete(
      {
        practitionerId: auth.practitioner.id,
        step: "step_create_academy_completed",
      },
      { repo },
    );

    // 5. Revalidate
    revalidatePath("/instructor");

    return { success: true, data: { academyId } };
  } catch (err) {
    console.error(
      "[createAcademyAndCompleteStepAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. selectExistingAcademyAndCompleteStepAction
// ---------------------------------------------------------------------------

const SelectExistingAcademySchema = z.object({
  academyId: z.string().uuid(),
});

export async function selectExistingAcademyAndCompleteStepAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // 1. Authentication
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Validation
  const parsed = SelectExistingAcademySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 3. Execute
  try {
    const repo = new SupabaseOnboardingProgressRepository();
    await markStepComplete(
      {
        practitionerId: auth.practitioner.id,
        step: "step_create_academy_completed",
      },
      { repo },
    );

    // 4. Revalidate
    revalidatePath("/instructor");

    return { success: true, data: undefined };
  } catch (err) {
    console.error(
      "[selectExistingAcademyAndCompleteStepAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. registerStudentAction (onboarding version)
// ---------------------------------------------------------------------------

export async function registerStudentAction(
  rawInput: unknown,
): Promise<ActionResult<SessionStudent>> {
  // 1. Authentication
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Validation
  const parsed = RegisterStudentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 3. Execute
  try {
    const temporaryPassword = crypto.randomUUID().slice(0, 8) + "K1!";

    // Create auth user
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email: parsed.data.email,
        password: temporaryPassword,
        email_confirm: true,
      });

    if (authError) {
      console.error(
        "[registerStudentAction] Auth user creation error:",
        authError,
      );
      return {
        success: false,
        error: "Error al crear la cuenta del alumno",
        code: "INTERNAL_ERROR",
      };
    }

    const authUserId = authData?.user?.id ?? null;

    // Create practitioner record
    const practitionerId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: practitionerError } = await adminSupabase
      .from("practitioners")
      .insert({
        id: practitionerId,
        full_name: parsed.data.fullName,
        birth_date: parsed.data.birthDate,
        grade: parsed.data.belt ?? "white",
        role: "alumno",
        is_active: false,
        auth_user_id: authUserId,
        contact_email: parsed.data.email,
        instructor_id: auth.practitioner.id,
        rut: `ONBOARDING-${practitionerId}`,
        gender: "other",
        start_date: now.slice(0, 10),
        qr_token: crypto.randomUUID(),
        updated_at: now,
        created_at: now,
      } as never);

    if (practitionerError) {
      console.error(
        "[registerStudentAction] Practitioner insert error:",
        practitionerError,
      );
      return {
        success: false,
        error: "Error al registrar el alumno",
        code: "INTERNAL_ERROR",
      };
    }

    // Assign to academy
    const { error: membershipError } = await adminSupabase
      .from("academy_memberships")
      .insert({
        id: crypto.randomUUID(),
        academy_id: parsed.data.academyId,
        practitioner_id: practitionerId,
        is_active: true,
        joined_at: now,
      } as never);

    if (membershipError) {
      console.error(
        "[registerStudentAction] Academy membership insert error:",
        membershipError,
      );
      // Non-fatal: student is created, membership failed — log and continue
    }

    const sessionStudent: SessionStudent = {
      practitionerId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      temporaryPassword,
    };

    return { success: true, data: sessionStudent };
  } catch (err) {
    console.error("[registerStudentAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// 4. markStepCompleteAction
// ---------------------------------------------------------------------------

const MarkStepSchema = z.object({
  step: z.enum(
    ONBOARDING_STEP_KEYS as [string, ...string[]] as [
      "step_create_academy_completed",
      "step_register_students_completed",
      "step_welcome_emails_completed",
      "step_events_info_completed",
    ],
  ),
});

export async function markStepCompleteAction(
  rawInput: unknown,
): Promise<ActionResult<OnboardingProgressDTO>> {
  // 1. Authentication
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Validation
  const parsed = MarkStepSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 3. Execute
  try {
    const repo = new SupabaseOnboardingProgressRepository();
    const progress = await markStepComplete(
      { practitionerId: auth.practitioner.id, step: parsed.data.step },
      { repo },
    );

    // 4. Revalidate
    revalidatePath("/instructor");

    return { success: true, data: toProgressDTO(progress) };
  } catch (err) {
    console.error("[markStepCompleteAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// 5. dispatchWelcomeEmailsAction
// ---------------------------------------------------------------------------

const DispatchWelcomeEmailsSchema = z.object({
  students: z.array(SessionStudentSchema),
});

export async function dispatchWelcomeEmailsAction(
  rawInput: unknown,
): Promise<ActionResult<{ failedCount: number }>> {
  // 1. Authentication
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }

  // 2. Validation
  const parsed = DispatchWelcomeEmailsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  // 3. Execute — iterate students, send emails, accumulate failures
  let failedCount = 0;

  for (const student of parsed.data.students) {
    try {
      await sendStudentWelcomeEmail(
        student.email,
        student.fullName,
        student.temporaryPassword,
      );
    } catch (err) {
      console.error(
        "[dispatchWelcomeEmailsAction] Failed for student:",
        student.fullName,
        err,
      );
      failedCount++;
    }
  }

  // 4. Mark step complete regardless of individual email failures
  try {
    const repo = new SupabaseOnboardingProgressRepository();
    await markStepComplete(
      {
        practitionerId: auth.practitioner.id,
        step: "step_welcome_emails_completed",
      },
      { repo },
    );
  } catch (err) {
    console.error(
      "[dispatchWelcomeEmailsAction] Failed to mark step complete:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }

  // 5. Revalidate
  revalidatePath("/instructor");

  return { success: true, data: { failedCount } };
}
