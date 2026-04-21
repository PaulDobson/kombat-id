import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  GradeExam,
  GradeExamItem,
  ExamStatus,
} from "../../domain/entities/gradeExam";
import type { Grade, Discipline } from "../../domain/entities/examTemplate";
import type {
  IGradeExamRepository,
  ExamFilters,
} from "../../domain/interfaces/gradeExamRepository";

type GradeExamRow = Database["public"]["Tables"]["grade_exams"]["Row"];
type GradeExamInsert = Database["public"]["Tables"]["grade_exams"]["Insert"];
type GradeExamItemRow = Database["public"]["Tables"]["grade_exam_items"]["Row"];
type GradeExamItemInsert =
  Database["public"]["Tables"]["grade_exam_items"]["Insert"];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const GradeExamRowSchema = z.object({
  id: z.string(),
  template_id: z.string(),
  practitioner_id: z.string(),
  instructor_id: z.string(),
  from_grade: z.string(),
  to_grade: z.string(),
  discipline: z.string(),
  exam_date: z.string(),
  status: z.string(),
  total_score: z.number().nullable(),
  max_possible_score: z.number().nullable(),
  score_percentage: z.number().nullable(),
  calculated_result: z.string().nullable(),
  instructor_override: z.boolean(),
  override_result: z.string().nullable(),
  override_justification: z.string().nullable(),
  final_result: z.string().nullable(),
  authorized_by: z.string().nullable(),
  authorized_at: z.string().nullable(),
  rejected_by: z.string().nullable(),
  rejection_reason: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const GradeExamItemRowSchema = z.object({
  id: z.string(),
  exam_id: z.string(),
  template_item_id: z.string().nullable(),
  item_name: z.string(),
  max_score: z.number(),
  score: z.number(),
  created_at: z.string(),
});

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleGradeExamRepository implements IGradeExamRepository {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<GradeExam | null> {
    const { data, error } = await adminSupabase
      .from("grade_exams")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find grade exam by id: ${error.message}`,
      );
    if (!data) return null;

    const items = await this.fetchItemsForExam(id);
    return this.fromRow(data as GradeExamRow, items);
  }

  async findByPractitioner(practitionerId: string): Promise<GradeExam[]> {
    const { data, error } = await adminSupabase
      .from("grade_exams")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .order("created_at", { ascending: false });

    if (error)
      throw new DomainError(
        `Failed to find grade exams by practitioner: ${error.message}`,
      );

    if (!data || data.length === 0) return [];

    return this.loadItemsForExams(data as GradeExamRow[]);
  }

  async findByInstructor(
    instructorId: string,
    filters?: ExamFilters,
  ): Promise<GradeExam[]> {
    let query = adminSupabase
      .from("grade_exams")
      .select("*")
      .eq("instructor_id", instructorId);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error)
      throw new DomainError(
        `Failed to find grade exams by instructor: ${error.message}`,
      );

    if (!data || data.length === 0) return [];

    return this.loadItemsForExams(data as GradeExamRow[]);
  }

  async findPendingAuthorization(): Promise<GradeExam[]> {
    const { data, error } = await adminSupabase
      .from("grade_exams")
      .select("*")
      .eq("status", "pending_authorization")
      .order("created_at", { ascending: true });

    if (error)
      throw new DomainError(
        `Failed to find pending authorization exams: ${error.message}`,
      );

    if (!data || data.length === 0) return [];

    return this.loadItemsForExams(data as GradeExamRow[]);
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async save(exam: GradeExam): Promise<void> {
    const examRow = this.toRow(exam);

    const { error: examError } = await adminSupabase
      .from("grade_exams")
      .insert(examRow as GradeExamInsert);

    if (examError)
      throw new DomainError(`Failed to save grade exam: ${examError.message}`);

    if (exam.items.length > 0) {
      const itemRows = exam.items.map((item) => this.toItemRow(item));
      const { error: itemsError } = await adminSupabase
        .from("grade_exam_items")
        .insert(itemRows as GradeExamItemInsert[]);

      if (itemsError) {
        await adminSupabase.from("grade_exams").delete().eq("id", exam.id);
        throw new DomainError(
          `Failed to save grade exam items: ${itemsError.message}`,
        );
      }
    }
  }

  async update(exam: GradeExam): Promise<void> {
    const { error } = await adminSupabase
      .from("grade_exams")
      .update({
        status: exam.status,
        total_score: exam.totalScore,
        max_possible_score: exam.maxPossibleScore,
        score_percentage: exam.scorePercentage,
        calculated_result: exam.calculatedResult,
        instructor_override: exam.instructorOverride,
        override_result: exam.overrideResult,
        override_justification: exam.overrideJustification,
        final_result: exam.finalResult,
        authorized_by: exam.authorizedBy,
        authorized_at: exam.authorizedAt,
        rejected_by: exam.rejectedBy,
        rejection_reason: exam.rejectionReason,
        notes: exam.notes,
        updated_at: exam.updatedAt,
      } as unknown as never)
      .eq("id", exam.id);

    if (error)
      throw new DomainError(`Failed to update grade exam: ${error.message}`);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async fetchItemsForExam(examId: string): Promise<GradeExamItemRow[]> {
    const { data, error } = await adminSupabase
      .from("grade_exam_items")
      .select("*")
      .eq("exam_id", examId);

    if (error)
      throw new DomainError(
        `Failed to load grade exam items: ${error.message}`,
      );

    return (data as GradeExamItemRow[]) ?? [];
  }

  /**
   * Batch-loads items for multiple exams in a single query to avoid N+1.
   */
  private async loadItemsForExams(rows: GradeExamRow[]): Promise<GradeExam[]> {
    const examIds = rows.map((r) => r.id);

    const { data: allItems, error: itemsError } = await adminSupabase
      .from("grade_exam_items")
      .select("*")
      .in("exam_id", examIds);

    if (itemsError)
      throw new DomainError(
        `Failed to load grade exam items: ${itemsError.message}`,
      );

    const itemsByExamId = new Map<string, GradeExamItemRow[]>();
    for (const item of (allItems as GradeExamItemRow[]) ?? []) {
      const list = itemsByExamId.get(item.exam_id) ?? [];
      list.push(item);
      itemsByExamId.set(item.exam_id, list);
    }

    return rows.map((row) =>
      this.fromRow(row, itemsByExamId.get(row.id) ?? []),
    );
  }

  private fromRow(row: GradeExamRow, itemRows: GradeExamItemRow[]): GradeExam {
    const parsed = GradeExamRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `GradeExam row failed schema validation: ${parsed.error.message}`,
      );
    }

    const items: GradeExamItem[] = itemRows.map((itemRow) => {
      const parsedItem = GradeExamItemRowSchema.safeParse(itemRow);
      if (!parsedItem.success) {
        throw new DomainError(
          `GradeExamItem row failed schema validation: ${parsedItem.error.message}`,
        );
      }
      return {
        id: parsedItem.data.id,
        examId: parsedItem.data.exam_id,
        templateItemId: parsedItem.data.template_item_id ?? "",
        itemName: parsedItem.data.item_name,
        maxScore: parsedItem.data.max_score,
        score: parsedItem.data.score,
      };
    });

    const d = parsed.data;
    return {
      id: d.id,
      templateId: d.template_id,
      practitionerId: d.practitioner_id,
      instructorId: d.instructor_id,
      fromGrade: d.from_grade as Grade,
      toGrade: d.to_grade as Grade,
      discipline: d.discipline as Discipline,
      examDate: d.exam_date,
      status: d.status as ExamStatus,
      items,
      totalScore: d.total_score ?? 0,
      maxPossibleScore: d.max_possible_score ?? 0,
      scorePercentage: d.score_percentage ?? 0,
      calculatedResult: (d.calculated_result ?? "failed") as
        | "approved"
        | "failed",
      instructorOverride: d.instructor_override,
      overrideResult: d.override_result as "approved" | "failed" | null,
      overrideJustification: d.override_justification,
      finalResult: (d.final_result ?? "failed") as "approved" | "failed",
      authorizedBy: d.authorized_by,
      authorizedAt: d.authorized_at,
      rejectedBy: d.rejected_by,
      rejectionReason: d.rejection_reason,
      notes: d.notes,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private toRow(exam: GradeExam): GradeExamInsert {
    return {
      id: exam.id,
      template_id: exam.templateId,
      practitioner_id: exam.practitionerId,
      instructor_id: exam.instructorId,
      from_grade: exam.fromGrade,
      to_grade: exam.toGrade,
      discipline: exam.discipline,
      exam_date: exam.examDate,
      status: exam.status,
      total_score: exam.totalScore,
      max_possible_score: exam.maxPossibleScore,
      score_percentage: exam.scorePercentage,
      calculated_result: exam.calculatedResult,
      instructor_override: exam.instructorOverride,
      override_result: exam.overrideResult,
      override_justification: exam.overrideJustification,
      final_result: exam.finalResult,
      authorized_by: exam.authorizedBy,
      authorized_at: exam.authorizedAt,
      rejected_by: exam.rejectedBy,
      rejection_reason: exam.rejectionReason,
      notes: exam.notes,
      created_at: exam.createdAt,
      updated_at: exam.updatedAt,
    };
  }

  private toItemRow(item: GradeExamItem): GradeExamItemInsert {
    return {
      id: item.id,
      exam_id: item.examId,
      template_item_id: item.templateItemId || null,
      item_name: item.itemName,
      max_score: item.maxScore,
      score: item.score,
    };
  }
}
