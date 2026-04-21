"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import { DrizzleExamTemplateRepository } from "../../infrastructure/repositories/drizzleExamTemplateRepository";
import { DrizzleGradeExamRepository } from "../../infrastructure/repositories/drizzleGradeExamRepository";
import {
  startExam,
  UnauthorizedExamCreation,
  ExamTemplateNotFound,
} from "../../application/use-cases/startExam";
import {
  submitExamScores,
  ExamNotFound,
  ItemScoreOutOfRange,
} from "../../application/use-cases/submitExamScores";
import {
  overrideExamResult,
  OverrideJustificationRequired,
} from "../../application/use-cases/overrideExamResult";
import { applyGradePromotion } from "../../application/use-cases/applyGradePromotion";
import { ExamAlreadyFinalized } from "../../domain/entities/gradeExam";
import type { GradeExam } from "../../domain/entities/gradeExam";
import type { Discipline, Grade } from "../../domain/entities/examTemplate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Instructor auth helper
// ---------------------------------------------------------------------------

interface InstructorInfo {
  id: string; // practitioners.id (UUID)
  authUserId: string; // auth.users UUID
}

async function requireInstructor(): Promise<InstructorInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await adminSupabase
    .from("practitioners")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, authUserId: user.id };
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

const ScoreInputSchema = z.object({
  itemId: z.string().min(1),
  score: z.number().min(0),
});

const StartExamSchema = z.object({
  practitionerId: z.string().min(1),
  toGrade: GradeSchema,
  discipline: z.string().min(1),
  examDate: z.string().min(1),
});

const SaveExamDraftSchema = z.object({
  examId: z.string().min(1),
  scores: z.array(ScoreInputSchema),
});

const SubmitExamSchema = z.object({
  examId: z.string().min(1),
  scores: z.array(ScoreInputSchema),
});

const OverrideExamResultSchema = z.object({
  examId: z.string().min(1),
  overrideResult: z.enum(["approved", "failed"]),
  overrideJustification: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Starts a new GradeExam for a practitioner owned by the authenticated instructor.
 * Validates: Requirements 2.1, 2.3, 10.1
 */
export async function startExamAction(
  rawInput: unknown,
): Promise<ActionResult<{ examId: string }>> {
  const instructor = await requireInstructor();
  if (!instructor) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = StartExamSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const examTemplateRepo = new DrizzleExamTemplateRepository();
    const gradeExamRepo = new DrizzleGradeExamRepository();

    const exam = await startExam(
      {
        practitionerId: parsed.data.practitionerId,
        instructorId: instructor.id,
        toGrade: parsed.data.toGrade as Grade,
        discipline: parsed.data.discipline as Discipline,
        examDate: parsed.data.examDate,
      },
      {
        examTemplateRepo,
        gradeExamRepo,
        getPractitioner: async (practitionerId: string) => {
          const { data } = await adminSupabase
            .from("practitioners")
            .select("id, grade, instructor_id")
            .eq("id", practitionerId)
            .maybeSingle();

          if (!data) return null;
          return {
            id: data.id,
            grade: data.grade as Grade,
            instructorId: data.instructor_id ?? "",
          };
        },
      },
    );

    revalidatePath("/instructor/grade-exams");
    return { success: true, data: { examId: exam.id } };
  } catch (err) {
    if (err instanceof UnauthorizedExamCreation) {
      return {
        success: false,
        error: "No autorizado para examinar este alumno",
      };
    }
    if (err instanceof ExamTemplateNotFound) {
      return { success: false, error: err.message };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[startExamAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Saves exam scores without submitting (keeps status as "draft").
 * Validates: Requirements 2.5, 3.1, 3.8, 10.1
 */
export async function saveExamDraftAction(
  rawInput: unknown,
): Promise<ActionResult<GradeExam>> {
  const instructor = await requireInstructor();
  if (!instructor) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = SaveExamDraftSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const gradeExamRepo = new DrizzleGradeExamRepository();

    // Load exam and verify ownership (Req 10.1)
    const exam = await gradeExamRepo.findById(parsed.data.examId);
    if (!exam) {
      return { success: false, error: "Examen no encontrado" };
    }
    if (exam.instructorId !== instructor.id) {
      return {
        success: false,
        error: "No autorizado para modificar este examen",
      };
    }

    // Load template to get minimumPassScore
    const examTemplateRepo = new DrizzleExamTemplateRepository();
    const template = await examTemplateRepo.findById(exam.templateId);
    if (!template) {
      return { success: false, error: "Pauta de examen no encontrada" };
    }

    const updatedExam = await submitExamScores(
      {
        examId: parsed.data.examId,
        scores: parsed.data.scores,
        minimumPassScore: template.minimumPassScore,
      },
      { gradeExamRepo },
    );

    revalidatePath(`/instructor/grade-exams/${parsed.data.examId}`);
    revalidatePath("/instructor/grade-exams");
    return { success: true, data: updatedExam };
  } catch (err) {
    if (err instanceof ExamNotFound) {
      return { success: false, error: "Examen no encontrado" };
    }
    if (err instanceof ItemScoreOutOfRange) {
      return { success: false, error: err.message };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[saveExamDraftAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Submits the exam, saves scores, and transitions status based on requiresAdminAuth and finalResult.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 10.1
 */
export async function submitExamAction(
  rawInput: unknown,
): Promise<ActionResult<GradeExam>> {
  const instructor = await requireInstructor();
  if (!instructor) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = SubmitExamSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const gradeExamRepo = new DrizzleGradeExamRepository();

    // Load exam and verify ownership (Req 10.1)
    const exam = await gradeExamRepo.findById(parsed.data.examId);
    if (!exam) {
      return { success: false, error: "Examen no encontrado" };
    }
    if (exam.instructorId !== instructor.id) {
      return {
        success: false,
        error: "No autorizado para modificar este examen",
      };
    }

    // Load template to get minimumPassScore and requiresAdminAuth
    const examTemplateRepo = new DrizzleExamTemplateRepository();
    const template = await examTemplateRepo.findById(exam.templateId);
    if (!template) {
      return { success: false, error: "Pauta de examen no encontrada" };
    }

    // Save scores (status stays "draft" after this call)
    const examWithScores = await submitExamScores(
      {
        examId: parsed.data.examId,
        scores: parsed.data.scores,
        minimumPassScore: template.minimumPassScore,
      },
      { gradeExamRepo },
    );

    // Determine new status based on requiresAdminAuth and finalResult (Req 5.1–5.4)
    let newStatus: GradeExam["status"];
    if (template.requiresAdminAuth) {
      // Req 5.4 — always pending_authorization when requiresAdminAuth = true
      newStatus = "pending_authorization";
    } else if (examWithScores.finalResult === "approved") {
      // Req 5.2 — approved + grade promotion
      newStatus = "approved";
    } else {
      // Req 5.3 — failed → submitted
      newStatus = "submitted";
    }

    const finalExam: GradeExam = {
      ...examWithScores,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    await gradeExamRepo.update(finalExam);

    // Req 5.2 — execute grade promotion when approved without admin auth
    if (newStatus === "approved") {
      await applyGradePromotion({ exam: finalExam }, { gradeExamRepo });
    }

    revalidatePath(`/instructor/grade-exams/${parsed.data.examId}`);
    revalidatePath("/instructor/grade-exams");
    return { success: true, data: finalExam };
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
    if (err instanceof ItemScoreOutOfRange) {
      return { success: false, error: err.message };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[submitExamAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Applies an instructor override to a GradeExam result.
 * Validates: Requirements 4.1, 10.1
 */
export async function overrideExamResultAction(
  rawInput: unknown,
): Promise<ActionResult<GradeExam>> {
  const instructor = await requireInstructor();
  if (!instructor) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = OverrideExamResultSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const gradeExamRepo = new DrizzleGradeExamRepository();

    // Verify instructor owns the exam (Req 10.1)
    const exam = await gradeExamRepo.findById(parsed.data.examId);
    if (!exam) {
      return { success: false, error: "Examen no encontrado" };
    }
    if (exam.instructorId !== instructor.id) {
      return {
        success: false,
        error: "No autorizado para modificar este examen",
      };
    }

    const updatedExam = await overrideExamResult(
      {
        examId: parsed.data.examId,
        overrideResult: parsed.data.overrideResult,
        overrideJustification: parsed.data.overrideJustification,
      },
      { gradeExamRepo },
    );

    revalidatePath(`/instructor/grade-exams/${parsed.data.examId}`);
    revalidatePath("/instructor/grade-exams");
    return { success: true, data: updatedExam };
  } catch (err) {
    if (err instanceof ExamNotFound) {
      return { success: false, error: "Examen no encontrado" };
    }
    if (err instanceof OverrideJustificationRequired) {
      return { success: false, error: err.message };
    }
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    console.error("[overrideExamResultAction] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor" };
  }
}
