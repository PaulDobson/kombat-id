"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import type { Academy } from "../../domain/entities/academy";
import { DrizzleAcademyRepository } from "../../infrastructure/repositories/drizzleAcademyRepository";
import { DrizzleAcademyMembershipRepository } from "../../infrastructure/repositories/drizzleAcademyMembershipRepository";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import {
  createAcademy,
  CreateAcademyInputSchema,
} from "../../application/use-cases/createAcademy";
import {
  deactivateAcademy,
  DeactivateAcademyInputSchema,
} from "../../application/use-cases/deactivateAcademy";
import {
  assignPractitionerToAcademy,
  AssignPractitionerToAcademyInputSchema,
} from "../../application/use-cases/assignPractitionerToAcademy";
import {
  removePractitionerFromAcademy,
  RemovePractitionerFromAcademyInputSchema,
} from "../../application/use-cases/removePractitionerFromAcademy";
import {
  AcademyNotFoundError,
  AcademyInactiveError,
  AcademyAlreadyDeactivatedError,
  PractitionerNotFoundError,
  PractitionerAlreadyInAcademyError,
  MembershipNotFoundError,
  InvalidInstructorRoleError,
  UnauthorizedError,
} from "../../domain/errors";
import type { AcademySearchQuery } from "../../domain/interfaces/academyRepository";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

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

export async function createAcademyAction(
  rawInput: unknown,
): Promise<ActionResult<{ academyId: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = CreateAcademyInputSchema.safeParse({
    ...(rawInput as object),
    adminId: admin.userId,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const academyRepo = new DrizzleAcademyRepository();
    const practitionerRepo = new DrizzlePractitionerRepository();
    const result = await createAcademy(parsed.data, {
      academyRepo,
      practitionerRepo,
      isAdmin,
    });
    revalidatePath("/admin/academies");
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof InvalidInstructorRoleError) {
      return {
        success: false,
        error: err.message,
        code: "INVALID_INSTRUCTOR_ROLE",
      };
    }
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    console.error("[createAcademyAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function deactivateAcademyAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = DeactivateAcademyInputSchema.safeParse({
    ...(rawInput as object),
    adminId: admin.userId,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const academyRepo = new DrizzleAcademyRepository();
    await deactivateAcademy(parsed.data, { academyRepo, isAdmin });
    revalidatePath("/admin/academies");
    revalidatePath("/academies");
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AcademyNotFoundError) {
      return {
        success: false,
        error: "Academia no encontrada",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof AcademyAlreadyDeactivatedError) {
      return {
        success: false,
        error: "La academia ya está desactivada",
        code: "ALREADY_DEACTIVATED",
      };
    }
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    console.error("[deactivateAcademyAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function assignPractitionerToAcademyAction(
  rawInput: unknown,
): Promise<ActionResult<{ membershipId: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = AssignPractitionerToAcademyInputSchema.safeParse({
    ...(rawInput as object),
    adminId: admin.userId,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const academyRepo = new DrizzleAcademyRepository();
    const membershipRepo = new DrizzleAcademyMembershipRepository();
    const practitionerRepo = new DrizzlePractitionerRepository();
    const result = await assignPractitionerToAcademy(parsed.data, {
      academyRepo,
      membershipRepo,
      practitionerRepo,
      isAdmin,
    });
    revalidatePath(`/admin/academies/${parsed.data.academyId}`);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof AcademyNotFoundError) {
      return {
        success: false,
        error: "Academia no encontrada",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof AcademyInactiveError) {
      return {
        success: false,
        error: "No se puede asignar a una academia inactiva",
        code: "ACADEMY_INACTIVE",
      };
    }
    if (err instanceof PractitionerAlreadyInAcademyError) {
      return {
        success: false,
        error: "El practicante ya pertenece a una academia",
        code: "ALREADY_MEMBER",
      };
    }
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    console.error("[assignPractitionerToAcademyAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function removePractitionerFromAcademyAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = RemovePractitionerFromAcademyInputSchema.safeParse({
    ...(rawInput as object),
    adminId: admin.userId,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const membershipRepo = new DrizzleAcademyMembershipRepository();
    await removePractitionerFromAcademy(parsed.data, {
      membershipRepo,
      isAdmin,
    });
    revalidatePath("/admin/academies");
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof MembershipNotFoundError) {
      return {
        success: false,
        error: "El practicante no tiene membresía activa",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    console.error(
      "[removePractitionerFromAcademyAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function addInstructorToAcademyAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = z
    .object({ academyId: z.string().uuid(), instructorId: z.string().uuid() })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  const { academyId, instructorId } = parsed.data;

  try {
    const academyRepo = new DrizzleAcademyRepository();
    const practitionerRepo = new DrizzlePractitionerRepository();

    const [academy, instructor] = await Promise.all([
      academyRepo.findById(academyId),
      practitionerRepo.findById(instructorId),
    ]);

    if (!academy) {
      return {
        success: false,
        error: "Academia no encontrada",
        code: "NOT_FOUND",
      };
    }
    if (!instructor) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (
      !["instructor", "profesor", "maestro"].includes(instructor.role ?? "")
    ) {
      return {
        success: false,
        error: "El practicante debe tener rol instructor, profesor o maestro",
        code: "INVALID_INSTRUCTOR_ROLE",
      };
    }
    if (academy.responsibleInstructorIds.includes(instructorId)) {
      return {
        success: false,
        error: "El instructor ya está vinculado a esta academia",
        code: "ALREADY_ASSIGNED",
      };
    }

    const updated: Academy = {
      ...academy,
      responsibleInstructorIds: [
        ...academy.responsibleInstructorIds,
        instructorId,
      ],
      updatedAt: new Date().toISOString(),
    };
    await academyRepo.save(updated);
    revalidatePath(`/admin/academies/${academyId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[addInstructorToAcademyAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function removeInstructorFromAcademyAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = z
    .object({ academyId: z.string().uuid(), instructorId: z.string().uuid() })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  const { academyId, instructorId } = parsed.data;

  try {
    const academyRepo = new DrizzleAcademyRepository();
    const academy = await academyRepo.findById(academyId);

    if (!academy) {
      return {
        success: false,
        error: "Academia no encontrada",
        code: "NOT_FOUND",
      };
    }

    const updated: Academy = {
      ...academy,
      responsibleInstructorIds: academy.responsibleInstructorIds.filter(
        (id) => id !== instructorId,
      ),
      updatedAt: new Date().toISOString(),
    };
    await academyRepo.save(updated);
    revalidatePath(`/admin/academies/${academyId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[removeInstructorFromAcademyAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function searchAcademiesAction(
  rawInput: unknown,
): Promise<ActionResult<Academy[]>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const query = rawInput as AcademySearchQuery;

  try {
    const academyRepo = new DrizzleAcademyRepository();
    const academies = await academyRepo.search(query ?? {});
    return { success: true, data: academies };
  } catch (err) {
    console.error("[searchAcademiesAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
