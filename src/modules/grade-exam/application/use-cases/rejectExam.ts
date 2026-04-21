import "server-only";

import type { GradeExam } from "../../domain/entities/gradeExam";
import { ExamAlreadyFinalized } from "../../domain/entities/gradeExam";
import type { IGradeExamRepository } from "../../domain/interfaces/gradeExamRepository";
import { ExamNotFound } from "./submitExamScores";

/**
 * Thrown when rejectionReason is empty or only whitespace.
 * Validates: Requirements 6.5, 6.6
 */
export class RejectionReasonRequired extends Error {
  constructor() {
    super("A non-empty rejectionReason is required to reject an exam.");
    this.name = "RejectionReasonRequired";
  }
}

export interface RejectExamInput {
  examId: string;
  rejectedBy: string; // auth.users UUID
  rejectionReason: string;
}

export interface RejectExamDeps {
  gradeExamRepo: IGradeExamRepository;
}

/**
 * Rejects a GradeExam that is pending admin authorization.
 *
 * 1. Validates rejectionReason is not empty or only whitespace — throws RejectionReasonRequired (Req 6.5, 6.6).
 * 2. Loads the exam via gradeExamRepo.findById — throws ExamNotFound if null (Req 6.3).
 * 3. Verifies exam.status === "pending_authorization" — throws ExamAlreadyFinalized if not (Req 6.4).
 * 4. Transitions exam to status = "rejected", sets rejectedBy and rejectionReason (Req 6.3).
 * 5. Persists the updated exam via gradeExamRepo.update() (Req 6.3).
 * 6. Returns the updated exam.
 *
 * Validates: Requirements 6.3, 6.4, 6.5, 6.6
 */
export async function rejectExam(
  input: RejectExamInput,
  deps: RejectExamDeps,
): Promise<GradeExam> {
  // Step 1 — Validate rejectionReason
  if (!input.rejectionReason || input.rejectionReason.trim() === "") {
    throw new RejectionReasonRequired();
  }

  // Step 2 — Load exam
  const exam = await deps.gradeExamRepo.findById(input.examId);
  if (!exam) {
    throw new ExamNotFound(input.examId);
  }

  // Step 3 — Verify exam is in "pending_authorization"
  if (exam.status !== "pending_authorization") {
    throw new ExamAlreadyFinalized(exam.status);
  }

  // Step 4 — Transition to "rejected", register rejectedBy and rejectionReason
  const updatedExam: GradeExam = {
    ...exam,
    status: "rejected",
    rejectedBy: input.rejectedBy,
    rejectionReason: input.rejectionReason,
    updatedAt: new Date().toISOString(),
  };

  // Step 5 — Persist
  await deps.gradeExamRepo.update(updatedExam);

  // Step 6 — Return updated exam
  return updatedExam;
}
