import "server-only";

import type { GradeExam } from "../../domain/entities/gradeExam";
import { ExamAlreadyFinalized } from "../../domain/entities/gradeExam";
import type { IGradeExamRepository } from "../../domain/interfaces/gradeExamRepository";
import { ExamNotFound } from "./submitExamScores";
import { applyGradePromotion } from "./applyGradePromotion";

export interface AuthorizeExamInput {
  examId: string;
  authorizedBy: string; // auth.users UUID
}

export interface AuthorizeExamDeps {
  gradeExamRepo: IGradeExamRepository;
}

/**
 * Authorizes a GradeExam that is pending admin authorization.
 *
 * 1. Loads the exam via gradeExamRepo.findById — throws ExamNotFound if null (Req 6.2).
 * 2. Verifies exam.status === "pending_authorization" — throws ExamAlreadyFinalized if not (Req 6.4).
 * 3. Transitions exam to status = "approved", sets authorizedBy and authorizedAt (Req 6.2).
 * 4. Persists the updated exam via gradeExamRepo.update() (Req 6.2).
 * 5. Calls applyGradePromotion to update the practitioner's grade (Req 6.2).
 * 6. Returns the updated exam.
 *
 * Validates: Requirements 6.2, 6.4
 */
export async function authorizeExam(
  input: AuthorizeExamInput,
  deps: AuthorizeExamDeps,
): Promise<GradeExam> {
  // Step 1 — Load exam
  const exam = await deps.gradeExamRepo.findById(input.examId);
  if (!exam) {
    throw new ExamNotFound(input.examId);
  }

  // Step 2 — Verify exam is in "pending_authorization"
  if (exam.status !== "pending_authorization") {
    throw new ExamAlreadyFinalized(exam.status);
  }

  // Step 3 — Transition to "approved", register authorizedBy and authorizedAt
  const updatedExam: GradeExam = {
    ...exam,
    status: "approved",
    authorizedBy: input.authorizedBy,
    authorizedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Step 4 — Persist
  await deps.gradeExamRepo.update(updatedExam);

  // Step 5 — Apply grade promotion
  await applyGradePromotion(
    { exam: updatedExam },
    { gradeExamRepo: deps.gradeExamRepo },
  );

  // Step 6 — Return updated exam
  return updatedExam;
}
