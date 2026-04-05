"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import type { Practitioner } from "../../domain/entities/practitioner";
import type { MartialHistoryEntry } from "../../domain/entities/martialHistoryEntry";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleMartialHistoryRepository } from "../../infrastructure/repositories/drizzleMartialHistoryRepository";
import { DrizzleCertificationRepository } from "../../infrastructure/repositories/drizzleCertificationRepository";
import { DrizzleAuditLogRepository } from "../../infrastructure/repositories/drizzleAuditLogRepository";
import {
  addMartialHistoryEntry,
  AddMartialHistoryEntryInputSchema,
} from "../../application/use-cases/addMartialHistoryEntry";
import {
  updatePractitionerGrade,
  UpdatePractitionerGradeInputSchema,
} from "../../application/use-cases/updatePractitionerGrade";
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
  PractitionerNotFoundError,
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
    const practitionerRepo = new DrizzlePractitionerRepository();
    const martialHistoryRepo = new DrizzleMartialHistoryRepository();
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

export async function updatePractitionerGradeAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = UpdatePractitionerGradeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = new DrizzlePractitionerRepository();
    const martialHistoryRepo = new DrizzleMartialHistoryRepository();
    const auditLogRepo = new DrizzleAuditLogRepository();
    await updatePractitionerGrade(parsed.data, {
      practitionerRepo,
      martialHistoryRepo,
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
    const practitionerRepo = new DrizzlePractitionerRepository();
    const certificationRepo = new DrizzleCertificationRepository();
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
    const certificationRepo = new DrizzleCertificationRepository();
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
    const practitionerRepo = new DrizzlePractitionerRepository();
    const auditLogRepo = new DrizzleAuditLogRepository();
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
    const practitionerRepo = new DrizzlePractitionerRepository();
    const auditLogRepo = new DrizzleAuditLogRepository();
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
    const practitionerRepo = new DrizzlePractitionerRepository();
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
