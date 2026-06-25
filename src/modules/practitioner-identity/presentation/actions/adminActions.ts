"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { isAdmin, requireAdmin } from "./_requireAdmin";
import type { Practitioner } from "../../domain/entities/practitioner";
import type { MartialHistoryEntry } from "../../domain/entities/martialHistoryEntry";
import { generateAndStoreMembershipCertificate } from "../../infrastructure/services/membershipCertificateService";
import { notifyInstructorStudentActivated } from "@/modules/notifications/presentation/actions/notificationHelpers";
import {
  addMartialHistoryEntry,
  AddMartialHistoryEntryInputSchema,
} from "../../application/use-cases/addMartialHistoryEntry";
import {
  updatePractitionerGrade,
  UpdatePractitionerGradeInputSchema,
} from "../../application/use-cases/updatePractitionerGrade";
import {
  updateDisciplineGrade,
  UpdateDisciplineGradeInputSchema,
} from "../../application/use-cases/updateDisciplineGrade";
import {
  issueCertification,
  IssueCertificationInputSchema,
} from "../../application/use-cases/issueCertification";
import {
  revokeCertification,
  RevokeCertificationInputSchema,
} from "../../application/use-cases/revokeCertification";
import {
  deactivatePractitioner,
  DeactivatePractitionerInputSchema,
} from "../../application/use-cases/deactivatePractitioner";
import {
  regenerateQrToken,
  RegenerateQrTokenInputSchema,
} from "../../application/use-cases/regenerateQrToken";
import {
  searchPractitioners,
  SearchPractitionersInputSchema,
} from "../../application/use-cases/searchPractitioners";
import {
  createAuditLogRepo,
  createCertificationRepo,
  createDisciplineGradeRepo,
  createMartialHistoryRepo,
  createPractitionerIdentityAdminClient,
  createPractitionerRepo,
} from "./_practitionerIdentityDeps";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
  DuplicateHistoryEntryError,
  CertificationNotFoundError,
  CertificationAlreadyRevokedError,
  InvalidGradeDowngradeError,
  UnauthorizedError,
} from "../../domain/errors";
import { DomainError } from "@/lib/errors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export async function addMartialHistoryEntryAction(
  rawInput: unknown,
): Promise<ActionResult<MartialHistoryEntry>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = AddMartialHistoryEntryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = createPractitionerRepo();
    const martialHistoryRepo = createMartialHistoryRepo();
    const entry = await addMartialHistoryEntry(parsed.data, {
      practitionerRepo,
      martialHistoryRepo,
    });
    return { success: true, data: entry };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof DuplicateHistoryEntryError) {
      return {
        success: false,
        error: "Ya existe una entrada para este practicante y evento",
        code: "DUPLICATE_ENTRY",
      };
    }
    console.error("[addMartialHistoryEntryAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// Extended schema that adds an optional `discipline` field on top of the base schema.
// When `discipline` is present the action delegates to `updateDisciplineGrade`;
// otherwise it falls back to the existing `updatePractitionerGrade` behaviour.
const UpdatePractitionerGradeActionSchema =
  UpdatePractitionerGradeInputSchema.extend({
    discipline: UpdateDisciplineGradeInputSchema.shape.discipline.optional(),
    dan: UpdateDisciplineGradeInputSchema.shape.dan.optional(),
    obtainedAt: UpdateDisciplineGradeInputSchema.shape.obtainedAt.optional(),
    certifyingMasterId:
      UpdateDisciplineGradeInputSchema.shape.certifyingMasterId.optional(),
    certificationId:
      UpdateDisciplineGradeInputSchema.shape.certificationId.optional(),
  });

export async function updatePractitionerGradeAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = UpdatePractitionerGradeActionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = createPractitionerRepo();
    const martialHistoryRepo = createMartialHistoryRepo();

    if (parsed.data.discipline) {
      // Req 13.4, 13.7 — discipline specified: delegate to updateDisciplineGrade
      const disciplineInput = UpdateDisciplineGradeInputSchema.parse({
        practitionerId: parsed.data.publicId,
        discipline: parsed.data.discipline,
        grade: parsed.data.newGrade,
        dan: parsed.data.dan ?? null,
        obtainedAt:
          parsed.data.obtainedAt ?? new Date().toISOString().split("T")[0],
        adminId: parsed.data.adminId,
        certifyingMasterId: parsed.data.certifyingMasterId ?? null,
        certificationId: parsed.data.certificationId ?? null,
      });

      const disciplineGradeRepo = createDisciplineGradeRepo();
      await updateDisciplineGrade(disciplineInput, {
        practitionerRepo,
        disciplineGradeRepo,
        martialHistoryRepo,
        isAdmin,
      });
    } else {
      // Req 13.7 — no discipline: existing behaviour (kombat_taekwondo only)
      const auditLogRepo = createAuditLogRepo();
      await updatePractitionerGrade(
        {
          publicId: parsed.data.publicId,
          newGrade: parsed.data.newGrade,
          adminId: parsed.data.adminId,
          justification: parsed.data.justification,
        },
        {
          practitionerRepo,
          martialHistoryRepo,
          auditLogRepo,
          isAdmin,
        },
      );
    }

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof PractitionerInactiveError) {
      return {
        success: false,
        error: "El practicante está inactivo",
        code: "PRACTITIONER_INACTIVE",
      };
    }
    if (err instanceof InvalidGradeDowngradeError) {
      return {
        success: false,
        error: "Para degradar el grado se requiere una justificación",
        code: "GRADE_DOWNGRADE_REQUIRES_JUSTIFICATION",
      };
    }
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    console.error("[updatePractitionerGradeAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function issueCertificationAction(
  rawInput: unknown,
): Promise<ActionResult<{ certId: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = IssueCertificationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = createPractitionerRepo();
    const certificationRepo = createCertificationRepo();
    const result = await issueCertification(parsed.data, {
      practitionerRepo,
      certificationRepo,
      isAdmin,
    });
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
    console.error("[issueCertificationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function revokeCertificationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = RevokeCertificationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const certificationRepo = createCertificationRepo();
    await revokeCertification(parsed.data, { certificationRepo, isAdmin });
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof CertificationNotFoundError) {
      return {
        success: false,
        error: "Certificación no encontrada",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof CertificationAlreadyRevokedError) {
      return {
        success: false,
        error: "La certificación ya fue revocada",
        code: "ALREADY_REVOKED",
      };
    }
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
    }
    console.error("[revokeCertificationAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function deactivatePractitionerAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = DeactivatePractitionerInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = createPractitionerRepo();
    const auditLogRepo = createAuditLogRepo();
    await deactivatePractitioner(parsed.data, {
      practitionerRepo,
      auditLogRepo,
      isAdmin,
    });
    return { success: true, data: undefined };
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
    console.error("[deactivatePractitionerAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function regenerateQrTokenAction(
  rawInput: unknown,
): Promise<ActionResult<{ token: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = RegenerateQrTokenInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = createPractitionerRepo();
    const auditLogRepo = createAuditLogRepo();
    const result = await regenerateQrToken(parsed.data, {
      practitionerRepo,
      auditLogRepo,
      isAdmin,
    });
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
    console.error("[regenerateQrTokenAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function searchPractitionersAction(
  rawInput: unknown,
): Promise<ActionResult<Practitioner[]>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = SearchPractitionersInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = createPractitionerRepo();
    const practitioners = await searchPractitioners(parsed.data, {
      practitionerRepo,
    });
    return { success: true, data: practitioners };
  } catch (err) {
    console.error("[searchPractitionersAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// activatePractitionerAction
// Activates an inactive practitioner after membership payment verification.
// Sets is_active = true and records the activation timestamp.
// ---------------------------------------------------------------------------

export async function activatePractitionerAction(
  rawInput: unknown,
): Promise<ActionResult<{ qrToken: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = z
    .object({
      publicId: z.string().uuid(),
      membershipNote: z.string().max(500).optional(),
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
    const practitionerRepo = createPractitionerRepo();
    const practitioner = await practitionerRepo.findById(parsed.data.publicId);

    if (!practitioner) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }

    if (practitioner.isActive) {
      return {
        success: false,
        error: "El practicante ya está activo",
        code: "ALREADY_ACTIVE",
      };
    }

    await practitionerRepo.save({
      ...practitioner,
      isActive: true,
      deactivatedAt: null,
      deactivationReason: null,
      updatedAt: new Date().toISOString(),
    });

    // Generar y guardar el certificado PDF automáticamente al activar
    try {
      await generateAndStoreMembershipCertificate(parsed.data.publicId);
    } catch (certErr) {
      console.error(
        "[activatePractitionerAction] Error al generar certificado:",
        certErr,
      );
      // No bloquear la activación si el certificado falla
    }

    // Notificar al instructor que registró al alumno
    if (practitioner.instructorId) {
      const supabase = createPractitionerIdentityAdminClient();
      try {
        // Obtener el auth_user_id del instructor
        const { data: instructorData } = await supabase
          .from("practitioners")
          .select("auth_user_id, full_name")
          .eq("id", practitioner.instructorId)
          .single();

        // Obtener nombre del administrador que activó
        const { data: adminData } = await supabase
          .from("practitioners")
          .select("full_name")
          .eq("auth_user_id", admin.userId)
          .single();

        if (instructorData?.auth_user_id) {
          await notifyInstructorStudentActivated({
            studentId: practitioner.id,
            studentName: practitioner.fullName,
            instructorId: instructorData.auth_user_id,
            instructorName: instructorData.full_name ?? "Instructor",
            activatedByName: adminData?.full_name ?? "Administrador",
            activatedByUserId: admin.userId,
          });
        }
      } catch (notifErr) {
        console.error(
          "[activatePractitionerAction] Failed to send notification:",
          notifErr,
        );
      }
    }

    return { success: true, data: { qrToken: practitioner.qrToken } };
  } catch (err) {
    console.error("[activatePractitionerAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// deletePractitionerAction
// Elimina completamente un practicante del sistema incluyendo:
// - Todas las membresías de academias (academy_memberships)
// - El registro del practicante (practitioners)
// - La cuenta de autenticación (auth.users) si existe
// ---------------------------------------------------------------------------

export async function deletePractitionerAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = z
    .object({
      publicId: z.string().uuid(),
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
    const practitionerRepo = createPractitionerRepo();
    const practitioner = await practitionerRepo.findById(parsed.data.publicId);

    if (!practitioner) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }

    console.log(
      "[deletePractitionerAction] Soft deleting practitioner:",
      parsed.data.publicId,
    );

    // SOFT DELETE: Marcar como eliminado lógicamente, solo auth.users se elimina físicamente
    const supabase = createPractitionerIdentityAdminClient();
    const practitionerId = parsed.data.publicId;

    // 1. Eliminar todas las membresías de academias
    const { data: deletedMemberships } = await supabase
      .from("academy_memberships")
      .delete()
      .eq("practitioner_id", practitionerId)
      .select("id");

    console.log(
      "[deletePractitionerAction] Deleted memberships:",
      deletedMemberships?.length ?? 0,
    );

    // 2. Revocar todas las certificaciones (soft delete)
    const { data: revokedCerts } = await supabase
      .from("certifications")
      .update({ is_revoked: true })
      .eq("practitioner_id", practitionerId)
      .eq("is_revoked", false)
      .select("id");

    console.log(
      "[deletePractitionerAction] Revoked certifications:",
      revokedCerts?.length ?? 0,
    );

    // 3. Desactivar grados de disciplinas (soft delete)
    const { data: deactivatedDisciplines } = await supabase
      .from("discipline_grades")
      .update({ is_active: false })
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true)
      .select("id");

    console.log(
      "[deletePractitionerAction] Deactivated discipline grades:",
      deactivatedDisciplines?.length ?? 0,
    );

    // 4. Actualizar practitioners que tienen este practitioner como instructor (SET NULL)
    const { data: updatedStudents } = await supabase
      .from("practitioners")
      .update({ instructor_id: null })
      .eq("instructor_id", practitionerId)
      .select("id");

    console.log(
      "[deletePractitionerAction] Updated students (removed instructor):",
      updatedStudents?.length ?? 0,
    );

    // 5. Marcar el practicante como eliminado (soft delete)
    const { data: deactivatedPractitioner, error: practitionerError } =
      await supabase
        .from("practitioners")
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: "Eliminado por administrador",
        })
        .eq("id", practitionerId)
        .select("id");

    console.log(
      "[deletePractitionerAction] Deactivated practitioner:",
      deactivatedPractitioner,
    );

    if (practitionerError) {
      console.error(
        "[deletePractitionerAction] Error deactivating practitioner:",
        practitionerError,
      );
      return {
        success: false,
        error: `Error al desactivar practicante: ${practitionerError.message}`,
        code: "INTERNAL_ERROR",
      };
    }

    // 6. ÚNICO ELIMINACIÓN FÍSICA: Eliminar la cuenta de autenticación de auth.users
    if (practitioner.authUserId) {
      console.log(
        "[deletePractitionerAction] Physically deleting auth user:",
        practitioner.authUserId,
      );

      const { error: authError } = await supabase.auth.admin.deleteUser(
        practitioner.authUserId,
      );

      if (authError) {
        console.error(
          "[deletePractitionerAction] Error deleting auth user:",
          authError,
        );
        // No retornamos error aquí porque el practicante ya fue desactivado
      } else {
        console.log(
          "[deletePractitionerAction] Auth user physically deleted successfully",
        );
      }
    }

    // Revalidar rutas para limpiar caché
    revalidatePath("/admin/practitioners");
    revalidatePath(`/admin/practitioners/${practitionerId}`);

    console.log("[deletePractitionerAction] Deletion completed successfully");

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[deletePractitionerAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
