import type { Grade, Discipline } from "./examTemplate";

export type ExamStatus =
  | "draft"
  | "submitted"
  | "pending_authorization"
  | "approved"
  | "rejected";

export interface GradeExamItem {
  id: string;
  examId: string;
  templateItemId: string;
  itemName: string; // snapshot of name at exam time
  maxScore: number; // snapshot of max score
  score: number; // assigned by instructor (0..maxScore)
}

export interface GradeExam {
  id: string;
  templateId: string;
  practitionerId: string;
  instructorId: string;
  fromGrade: Grade;
  toGrade: Grade;
  discipline: Discipline;
  examDate: string; // ISO date (YYYY-MM-DD)
  status: ExamStatus;
  // Scores
  items: GradeExamItem[];
  totalScore: number;
  maxPossibleScore: number;
  scorePercentage: number;
  calculatedResult: "approved" | "failed";
  // Instructor override
  instructorOverride: boolean;
  overrideResult: "approved" | "failed" | null;
  overrideJustification: string | null;
  // Effective result
  finalResult: "approved" | "failed";
  // Admin authorization
  authorizedBy: string | null;
  authorizedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  // Metadata
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculates exam score metrics from a list of GradeExamItems.
 *
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7
 */
export function calculateExamScore(
  items: GradeExamItem[],
  minimumPassScore: number,
): {
  totalScore: number;
  maxPossibleScore: number;
  scorePercentage: number;
  calculatedResult: "approved" | "failed";
} {
  const totalScore = items.reduce((sum, item) => sum + item.score, 0);
  const maxPossibleScore = items.reduce((sum, item) => sum + item.maxScore, 0);

  // Edge case: avoid division by zero
  const scorePercentage =
    maxPossibleScore === 0 ? 0 : (totalScore / maxPossibleScore) * 100;

  const calculatedResult: "approved" | "failed" =
    scorePercentage >= minimumPassScore ? "approved" : "failed";

  return { totalScore, maxPossibleScore, scorePercentage, calculatedResult };
}

/**
 * Error thrown when attempting to modify an exam that is already in a terminal state.
 */
export class ExamAlreadyFinalized extends Error {
  constructor(currentStatus: ExamStatus) {
    super(
      `Exam is already finalized with status "${currentStatus}" and cannot be modified.`,
    );
    this.name = "ExamAlreadyFinalized";
  }
}

const TERMINAL_STATES: ExamStatus[] = ["approved", "rejected"];

/**
 * Validates that the current exam status allows further transitions.
 * Throws ExamAlreadyFinalized if the exam is in a terminal state.
 *
 * Validates: Requirements 5.5, 6.4
 */
export function validateExamTransition(currentStatus: ExamStatus): void {
  if (TERMINAL_STATES.includes(currentStatus)) {
    throw new ExamAlreadyFinalized(currentStatus);
  }
}

/**
 * Determines the final result of an exam, considering instructor override.
 *
 * Validates: Requirements 4.3, 4.4
 */
export function determineFinalResult(
  calculatedResult: "approved" | "failed",
  instructorOverride: boolean,
  overrideResult: "approved" | "failed" | null,
): "approved" | "failed" {
  if (instructorOverride && overrideResult !== null) {
    return overrideResult;
  }
  return calculatedResult;
}
