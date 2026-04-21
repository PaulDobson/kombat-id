import type { GradeExam } from "../../domain/entities/gradeExam";
import {
  calculateExamScore,
  determineFinalResult,
} from "../../domain/entities/gradeExam";
import type { IGradeExamRepository } from "../../domain/interfaces/gradeExamRepository";

/**
 * Thrown when no GradeExam is found for the given id.
 * Validates: Requirement 3.1
 */
export class ExamNotFound extends Error {
  constructor(examId: string) {
    super(`GradeExam with id "${examId}" was not found.`);
    this.name = "ExamNotFound";
  }
}

/**
 * Thrown when a score for a specific item is outside the valid range [0, maxScore].
 * Validates: Requirements 3.1, 3.2
 */
export class ItemScoreOutOfRange extends Error {
  constructor(
    public readonly itemId: string,
    public readonly score: number,
    public readonly maxScore: number,
  ) {
    super(
      `Score ${score} for item "${itemId}" is out of range [0, ${maxScore}].`,
    );
    this.name = "ItemScoreOutOfRange";
  }
}

export interface ScoreInput {
  itemId: string;
  score: number;
}

export interface SubmitExamScoresInput {
  examId: string;
  scores: ScoreInput[];
  minimumPassScore: number;
}

export interface SubmitExamScoresDeps {
  gradeExamRepo: IGradeExamRepository;
}

/**
 * Saves scores for each GradeExamItem and recalculates the exam result.
 * The exam status remains "draft" — status transition happens in a separate step.
 *
 * 1. Loads the exam via gradeExamRepo.findById — throws ExamNotFound if null (Req 3.1).
 * 2. Validates each score is in [0, maxScore] — throws ItemScoreOutOfRange if invalid (Req 3.1, 3.2).
 * 3. Updates each GradeExamItem.score with the provided score (Req 3.3, 3.4).
 * 4. Calls calculateExamScore to get totalScore, maxPossibleScore, scorePercentage, calculatedResult (Req 3.3–3.7).
 * 5. Calls determineFinalResult to get finalResult (Req 4.3, 4.4).
 * 6. Persists the updated exam via gradeExamRepo.update() — status stays "draft" (Req 3.8).
 * 7. Returns the updated exam.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
export async function submitExamScores(
  input: SubmitExamScoresInput,
  deps: SubmitExamScoresDeps,
): Promise<GradeExam> {
  // Step 1 — Load exam
  const exam = await deps.gradeExamRepo.findById(input.examId);
  if (!exam) {
    throw new ExamNotFound(input.examId);
  }

  // Build a lookup map for quick access by itemId
  const itemMap = new Map(exam.items.map((item) => [item.id, item]));

  // Step 2 — Validate each score is in [0, maxScore]
  for (const { itemId, score } of input.scores) {
    const item = itemMap.get(itemId);
    if (!item) continue; // unknown itemId — skip silently (not in scope)
    if (score < 0 || score > item.maxScore) {
      throw new ItemScoreOutOfRange(itemId, score, item.maxScore);
    }
  }

  // Step 3 — Apply scores to items
  const scoreByItemId = new Map(
    input.scores.map(({ itemId, score }) => [itemId, score]),
  );

  const updatedItems = exam.items.map((item) => ({
    ...item,
    score: scoreByItemId.has(item.id)
      ? (scoreByItemId.get(item.id) ?? item.score)
      : item.score,
  }));

  // Step 4 — Recalculate exam score metrics
  const { totalScore, maxPossibleScore, scorePercentage, calculatedResult } =
    calculateExamScore(updatedItems, input.minimumPassScore);

  // Step 5 — Determine final result (considering instructor override)
  const finalResult = determineFinalResult(
    calculatedResult,
    exam.instructorOverride,
    exam.overrideResult,
  );

  // Step 6 — Build updated exam (status stays "draft")
  const updatedExam: GradeExam = {
    ...exam,
    items: updatedItems,
    totalScore,
    maxPossibleScore,
    scorePercentage,
    calculatedResult,
    finalResult,
    updatedAt: new Date().toISOString(),
  };

  await deps.gradeExamRepo.update(updatedExam);

  return updatedExam;
}
