import "server-only";

import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { GradeExam } from "../../domain/entities/gradeExam";
import type { IGradeExamRepository } from "../../domain/interfaces/gradeExamRepository";

/**
 * Applies a grade promotion for an approved GradeExam.
 *
 * Steps:
 * 1. Updates practitioners.grade = exam.toGrade via adminSupabase.
 * 2. Creates a martial_history entry with event_type = "exam".
 * 3. If the practitioners.grade update fails, reverts the exam status back to
 *    "pending_authorization" and re-throws the error.
 *
 * This use case is ONLY invoked from other use cases (e.g. submitExam,
 * authorizeExam). It must never be called directly from the presentation layer.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
export async function applyGradePromotion(
  input: { exam: GradeExam },
  deps: { gradeExamRepo: IGradeExamRepository },
): Promise<void> {
  const { exam } = input;

  // Step 1 — Update practitioners.grade = toGrade (Req 7.1)
  const { error: gradeError } = await adminSupabase
    .from("practitioners")
    .update({
      grade: exam.toGrade,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", exam.practitionerId);

  if (gradeError) {
    // Step 4 — Revert exam status to "pending_authorization" on failure (Req 7.4)
    const revertedExam: GradeExam = {
      ...exam,
      status: "pending_authorization",
      updatedAt: new Date().toISOString(),
    };

    try {
      await deps.gradeExamRepo.update(revertedExam);
    } catch {
      // Best-effort revert; log but don't mask the original error
    }

    throw new DomainError(
      `Grade promotion failed — practitioners.grade update error: ${gradeError.message}`,
    );
  }

  // Step 2 — Create martial_history entry with event_type = "exam" (Req 7.2)
  // recorded_by references auth.users(id), so we need the auth_user_id of the instructor
  // If the exam was authorized by an admin, use that (already an auth.users UUID).
  // Otherwise look up the instructor's auth_user_id from practitioners.
  let recordedBy: string | null = exam.authorizedBy ?? null;

  if (!recordedBy) {
    const { data: instructorRow } = await adminSupabase
      .from("practitioners")
      .select("auth_user_id")
      .eq("id", exam.instructorId)
      .maybeSingle();
    recordedBy = instructorRow?.auth_user_id ?? null;
  }

  if (!recordedBy) {
    throw new DomainError(
      "Grade promotion succeeded but could not determine recorded_by for martial_history (instructor has no auth user).",
    );
  }

  const { error: historyError } = await adminSupabase
    .from("martial_history")
    .insert({
      practitioner_id: exam.practitionerId,
      event_type: "exam",
      event_date: exam.examDate,
      recorded_by: recordedBy,
      notes: `Grade exam id: ${exam.id}`,
      is_corrected: false,
    } as unknown as never);

  if (historyError) {
    throw new DomainError(
      `Grade promotion succeeded but failed to create martial_history entry: ${historyError.message}`,
    );
  }
}
