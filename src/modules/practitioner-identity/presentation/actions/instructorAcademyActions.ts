"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import type { Academy, ChileanRegion } from "../../domain/entities/academy";
import { DrizzleAcademyRepository } from "../../infrastructure/repositories/drizzleAcademyRepository";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import { isInstructorRole } from "@/lib/roles";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---------------------------------------------------------------------------
// Auth helper — verifies session and instructor role
// Returns the practitioner record for the authenticated instructor.
// ---------------------------------------------------------------------------

async function requireInstructor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner) return null;
  if (!isInstructorRole(practitioner.role as string)) return null;

  return { userId: user.id, practitionerId: practitioner.id as string };
}

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const CreateInstructorAcademyInputSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200).trim(),
  region: z.enum(
    [
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
    ],
    { error: "Selecciona una región válida" },
  ),
  city: z.string().min(1, "La ciudad es requerida").max(100).trim(),
  address: z.string().max(300).trim().optional(),
  foundedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional(),
});

// ---------------------------------------------------------------------------
// Action — instructor creates their own academy
// The authenticated instructor is automatically set as responsible instructor.
// ---------------------------------------------------------------------------

export async function createInstructorAcademyAction(
  rawInput: unknown,
): Promise<ActionResult<{ academyId: string }>> {
  // Step 1 — Authentication + role check
  const instructor = await requireInstructor();
  if (!instructor) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  // Step 2 — Input validation
  const parsed = CreateInstructorAcademyInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const academyRepo = new DrizzleAcademyRepository();
    const practitionerRepo = new DrizzlePractitionerRepository();

    // Verify the practitioner record exists and has instructor role
    const practitioner = await practitionerRepo.findById(
      instructor.practitionerId,
    );
    if (!practitioner || !isInstructorRole(practitioner.role ?? "")) {
      return {
        success: false,
        error: "Tu perfil de instructor no está configurado correctamente",
        code: "FORBIDDEN",
      };
    }

    const now = new Date().toISOString();
    const academy: Academy = {
      id: crypto.randomUUID(),
      name: parsed.data.name,
      region: parsed.data.region as ChileanRegion,
      city: parsed.data.city,
      address: parsed.data.address ?? null,
      foundedDate: parsed.data.foundedDate ?? null,
      isActive: true,
      deactivatedAt: null,
      deactivationReason: null,
      // Instructor is automatically assigned as responsible
      responsibleInstructorIds: [instructor.practitionerId],
      createdBy: instructor.userId,
      updatedAt: now,
      createdAt: now,
    };

    await academyRepo.save(academy);
    revalidatePath("/instructor");
    return { success: true, data: { academyId: academy.id } };
  } catch (err) {
    console.error("[createInstructorAcademyAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// Guard helper — verifies the instructor is responsible for the given academy
// ---------------------------------------------------------------------------

async function requireInstructorForAcademy(academyId: string) {
  const instructor = await requireInstructor();
  if (!instructor) return null;

  const academyRepo = new DrizzleAcademyRepository();
  const academy = await academyRepo.findById(academyId);
  if (!academy) return null;
  if (!academy.responsibleInstructorIds.includes(instructor.practitionerId))
    return null;

  return { instructor, academy, academyRepo };
}

// ---------------------------------------------------------------------------
// Action — instructor assigns a practitioner to their academy
// ---------------------------------------------------------------------------

export async function instructorAssignPractitionerAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = z
    .object({
      academyId: z.string().uuid(),
      practitionerId: z.string().uuid(),
    })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const ctx = await requireInstructorForAcademy(parsed.data.academyId);
  if (!ctx) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  try {
    const { data: existing } = await adminSupabase
      .from("academy_memberships")
      .select("id")
      .eq("practitioner_id", parsed.data.practitionerId)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "El practicante ya pertenece a una academia",
        code: "ALREADY_MEMBER",
      };
    }

    await adminSupabase.from("academy_memberships").insert({
      id: crypto.randomUUID(),
      academy_id: parsed.data.academyId,
      practitioner_id: parsed.data.practitionerId,
      is_active: true,
      joined_at: new Date().toISOString(),
    });

    revalidatePath(`/instructor/academies/${parsed.data.academyId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error(
      "[instructorAssignPractitionerAction] Unexpected error:",
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
// Action — instructor removes a practitioner from their academy
// ---------------------------------------------------------------------------

export async function instructorRemovePractitionerAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = z
    .object({
      academyId: z.string().uuid(),
      practitionerId: z.string().uuid(),
    })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const ctx = await requireInstructorForAcademy(parsed.data.academyId);
  if (!ctx) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  try {
    await adminSupabase
      .from("academy_memberships")
      .update({ is_active: false })
      .eq("academy_id", parsed.data.academyId)
      .eq("practitioner_id", parsed.data.practitionerId)
      .eq("is_active", true);

    revalidatePath(`/instructor/academies/${parsed.data.academyId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error(
      "[instructorRemovePractitionerAction] Unexpected error:",
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
// Action — instructor updates their own profile data
// ---------------------------------------------------------------------------

const UpdateInstructorProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(200)
    .trim(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida")
    .optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  contactPhone: z.string().max(30).trim().nullable().optional(),
  contactEmail: z
    .string()
    .email("Email inválido")
    .max(254)
    .trim()
    .nullable()
    .optional(),
  addressStreet: z.string().max(300).trim().nullable().optional(),
  addressCity: z.string().max(100).trim().nullable().optional(),
  addressRegion: z.string().max(100).trim().nullable().optional(),
});

export async function updateInstructorProfileAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const instructor = await requireInstructor();
  if (!instructor) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  const parsed = UpdateInstructorProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = new DrizzlePractitionerRepository();
    const practitioner = await practitionerRepo.findById(
      instructor.practitionerId,
    );
    if (!practitioner) {
      return {
        success: false,
        error: "Perfil no encontrado",
        code: "NOT_FOUND",
      };
    }

    await practitionerRepo.save({
      ...practitioner,
      fullName: parsed.data.fullName,
      birthDate: parsed.data.birthDate ?? practitioner.birthDate,
      gender: parsed.data.gender ?? practitioner.gender,
      contactPhone: parsed.data.contactPhone ?? practitioner.contactPhone,
      contactEmail: parsed.data.contactEmail ?? practitioner.contactEmail,
      addressStreet: parsed.data.addressStreet ?? practitioner.addressStreet,
      addressCity: parsed.data.addressCity ?? practitioner.addressCity,
      addressRegion: parsed.data.addressRegion ?? practitioner.addressRegion,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/instructor/profile");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[updateInstructorProfileAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// Action — instructor updates their academy data
// ---------------------------------------------------------------------------

const UpdateInstructorAcademySchema = z.object({
  academyId: z.string().uuid(),
  name: z.string().min(1, "El nombre es requerido").max(200).trim(),
  city: z.string().min(1, "La ciudad es requerida").max(100).trim(),
  address: z.string().max(300).trim().nullable().optional(),
  foundedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .nullable()
    .optional(),
});

export async function updateInstructorAcademyAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = UpdateInstructorAcademySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const ctx = await requireInstructorForAcademy(parsed.data.academyId);
  if (!ctx) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  try {
    const updated = {
      ...ctx.academy,
      name: parsed.data.name,
      city: parsed.data.city,
      address: parsed.data.address ?? ctx.academy.address,
      foundedDate: parsed.data.foundedDate ?? ctx.academy.foundedDate,
      updatedAt: new Date().toISOString(),
    };

    await ctx.academyRepo.save(updated);
    revalidatePath(`/instructor/academies/${parsed.data.academyId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[updateInstructorAcademyAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
