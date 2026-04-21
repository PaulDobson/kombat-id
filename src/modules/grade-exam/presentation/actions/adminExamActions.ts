"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import { DrizzleExamTemplateRepository } from "../../infrastructure/repositories/drizzleExamTemplateRepository";
import { DrizzleGradeExamRepository } from "../../infrastructure/repositories/drizzleGradeExamRepository";
import {
  configureExamTemplate,
  DuplicateExamTemplate,
} from "../../application/use-cases/configureExamTemplate";
import { authorizeExam } from "../../application/use-cases/authorizeExam";
import {
  rejectExam,
  RejectionReasonRequired,
} from "../../application/use-cases/rejectExam";
import { ExamNotFound } from "../../application/use-cases/submitExamScores";
import { ExamAlreadyFinalized } from "../../domain/entities/gradeExam";
import type { ExamTemplate } from "../../domain/entities/examTemplate";
import type { GradeExam } from "../../domain/entities/gradeExam";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Admin auth helper
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
// Zod schemas
// ---------------------------------------------------------------------------

const GradeSchema = z.enum([
  "white",
  "yellow",
  "green",
  "blue",
  "red",
  "black",
]);

const ExamTemplateItemInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  maxScore: z.number().positive(),
  order: z.number().int().min(0),
});

const CreateExamTemplateSchema = z.object({
  fromGrade: GradeSchema,
  toGrade: GradeSchema,
  discipline: z.string().min(1),
  minimumPassScore: z.number().min(0).max(100),
  requiresAdminAuth: z.boolean(),
  items: z.array(ExamTemplateItemInputSchema),
});

const UpdateExamTemplateSchema = z.object({
  templateId: z.string().min(1),
  minimumPassScore: z.number().min(0).max(100).optional(),
  requiresAdminAuth: z.boolean().optional(),
  items: z.array(ExamTemplateItemInputSchema).optional(),
});

const DeactivateExamTemplateSchema = z.object({
  templateId: z.string().min(1),
});

const AuthorizeExamSchema = z.object({
  examId: z.string().min(1),
});

const RejectExamSchema = z.object({
  examId: z.string().min(1),
  rejectionReason: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new ExamTemplate. Requires admin role.
 * Validates: Requirements 1.1, 1.3, 1.6, 10.2
 */
export async function createExamTemplateAction(
  rawInput: unknown,
): Promise<ActionResult<ExamTemplate>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = CreateExamTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const examTemplateRepo = new DrizzleExamTemplateRepository();
    const template = await configureExamTemplate(
      {
        fromGrade: parsed.data.fromGrade,
        toGrade: parsed.data.toGrade,
        discipline: parsed.data.discipline,
        minimumPassScore: parsed.data.minimumPassScore,
        requiresAdminAuth: parsed.data.requiresAdminAuth,
        items: parsed.data.items.map((item) => ({
          name: item.name,
          description: item.description,
          maxScore: item.maxScore,
          order: item.order,
        })),
        createdBy: admin.userId,
      },
      { examTemplateRepo },
    );
    revalidatePath("/admin/exam-templates");
    return { success: true, data: template };
  } catch (err) {
    if (err instanceof DuplicateExamTemplate) {
      return { success: false, error: err.message };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[createExamTemplateAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Updates an existing ExamTemplate's fields. Requires admin role.
 * Validates: Requirements 1.3, 10.2
 */
export async function updateExamTemplateAction(
  rawInput: unknown,
): Promise<ActionResult<ExamTemplate>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = UpdateExamTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const examTemplateRepo = new DrizzleExamTemplateRepository();
    const existing = await examTemplateRepo.findById(parsed.data.templateId);
    if (!existing) {
      return { success: false, error: "Pauta de examen no encontrada" };
    }

    const updated: typeof existing = {
      ...existing,
      minimumPassScore:
        parsed.data.minimumPassScore ?? existing.minimumPassScore,
      requiresAdminAuth:
        parsed.data.requiresAdminAuth ?? existing.requiresAdminAuth,
      items:
        parsed.data.items != null
          ? parsed.data.items.map((item, idx) => ({
              id: crypto.randomUUID(),
              templateId: existing.id,
              name: item.name,
              description: item.description ?? null,
              maxScore: item.maxScore,
              order: item.order ?? idx,
            }))
          : existing.items,
      updatedAt: new Date().toISOString(),
    };

    await examTemplateRepo.update(updated);
    revalidatePath("/admin/exam-templates");
    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[updateExamTemplateAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Deactivates an ExamTemplate by setting isActive = false. Requires admin role.
 * Validates: Requirements 1.4, 10.2
 */
export async function deactivateExamTemplateAction(
  rawInput: unknown,
): Promise<ActionResult<ExamTemplate>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = DeactivateExamTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const examTemplateRepo = new DrizzleExamTemplateRepository();
    const existing = await examTemplateRepo.findById(parsed.data.templateId);
    if (!existing) {
      return { success: false, error: "Pauta de examen no encontrada" };
    }

    const deactivated: typeof existing = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    await examTemplateRepo.update(deactivated);
    revalidatePath("/admin/exam-templates");
    return { success: true, data: deactivated };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[deactivateExamTemplateAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Authorizes a GradeExam pending admin authorization. Requires admin role.
 * Validates: Requirements 6.2, 6.3, 10.2
 */
export async function authorizeExamAction(
  rawInput: unknown,
): Promise<ActionResult<GradeExam>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = AuthorizeExamSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const gradeExamRepo = new DrizzleGradeExamRepository();
    const exam = await authorizeExam(
      { examId: parsed.data.examId, authorizedBy: admin.userId },
      { gradeExamRepo },
    );
    revalidatePath("/admin/grade-exams");
    return { success: true, data: exam };
  } catch (err) {
    if (err instanceof ExamNotFound) {
      return { success: false, error: "Examen no encontrado" };
    }
    if (err instanceof ExamAlreadyFinalized) {
      return {
        success: false,
        error: "Este examen ya fue finalizado y no puede modificarse",
      };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[authorizeExamAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Rejects a GradeExam pending admin authorization. Requires admin role.
 * Validates: Requirements 6.3, 6.5, 6.6, 10.2
 */
export async function rejectExamAction(
  rawInput: unknown,
): Promise<ActionResult<GradeExam>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = RejectExamSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const gradeExamRepo = new DrizzleGradeExamRepository();
    const exam = await rejectExam(
      {
        examId: parsed.data.examId,
        rejectedBy: admin.userId,
        rejectionReason: parsed.data.rejectionReason,
      },
      { gradeExamRepo },
    );
    revalidatePath("/admin/grade-exams");
    return { success: true, data: exam };
  } catch (err) {
    if (err instanceof ExamNotFound) {
      return { success: false, error: "Examen no encontrado" };
    }
    if (err instanceof ExamAlreadyFinalized) {
      return {
        success: false,
        error: "Este examen ya fue finalizado y no puede modificarse",
      };
    }
    if (err instanceof RejectionReasonRequired) {
      return { success: false, error: err.message };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[rejectExamAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}
