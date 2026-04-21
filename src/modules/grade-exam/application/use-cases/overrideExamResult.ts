import type { GradeExam } from "../../domain/entities/gradeExam";
import { determineFinalResult } from "../../domain/entities/gradeExam";
import type { IGradeExamRepository } from "../../domain/interfaces/gradeExamRepository";
import { ExamNotFound } from "./submitExamScores";

/**
 * Thrown when overrideJustification is empty or contains only whitespace.
 * Validates: Requirements 4.1, 4.2
 */
export class OverrideJustificationRequired extends Error {
  constructor() {
    super(
      "overrideJustification is required and cannot be empty or whitespace.",
    );
    this.name = "OverrideJustificationRequired";
  }
}

export interface OverrideExamResultInput {
  examId: string;
  overrideResult: "approved" | "failed";
  overrideJustification: string;
}

export interface OverrideExamResultDeps {
  gradeExamRepo: IGradeExamRepository;
}

/**
 * Applies an instructor override to a GradeExam result.
 *
 * 1. Validates overrideJustification is non-empty — throws OverrideJustificationRequired if invalid (Req 4.1, 4.2).
 * 2. Loads the exam via gradeExamRepo.findById — throws ExamNotFound if null (Req 4.5).
 * 3. Sets instructorOverride = true, overrideResult and overrideJustification (Req 4.5).
 * 4. Recalculates finalResult via determineFinalResult (Req 4.3).
 * 5. Persists the updated exam via gradeExamRepo.update().
 * 6. Returns the updated exam.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function overrideExamResult(
  input: OverrideExamResultInput,
  deps: OverrideExamResultDeps,
): Promise<GradeExam> {
  // Step 1 — Validate justification
  if (
    !input.overrideJustification ||
    input.overrideJustification.trim() === ""
  ) {
    throw new OverrideJustificationRequired();
  }

  // Step 2 — Load exam
  const exam = await deps.gradeExamRepo.findById(input.examId);
  if (!exam) {
    throw new ExamNotFound(input.examId);
  }

  // Step 3 & 4 — Apply override and recalculate finalResult
  const finalResult = determineFinalResult(
    exam.calculatedResult,
    true,
    input.overrideResult,
  );

  const updatedExam: GradeExam = {
    ...exam,
    instructorOverride: true,
    overrideResult: input.overrideResult,
    overrideJustification: input.overrideJustification,
    finalResult,
    updatedAt: new Date().toISOString(),
  };

  // Step 5 — Persist
  await deps.gradeExamRepo.update(updatedExam);

  // Step 6 — Return updated exam
  return updatedExam;
}
