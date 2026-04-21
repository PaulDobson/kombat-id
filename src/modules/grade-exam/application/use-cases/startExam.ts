import type { Grade, Discipline } from "../../domain/entities/examTemplate";
import type { GradeExam, GradeExamItem } from "../../domain/entities/gradeExam";
import type { IExamTemplateRepository } from "../../domain/interfaces/examTemplateRepository";
import type { IGradeExamRepository } from "../../domain/interfaces/gradeExamRepository";

/**
 * Thrown when the practitioner does not belong to the authenticated instructor.
 * Validates: Requirement 2.3
 */
export class UnauthorizedExamCreation extends Error {
  constructor(practitionerId: string, instructorId: string) {
    super(
      `Practitioner "${practitionerId}" does not belong to instructor "${instructorId}".`,
    );
    this.name = "UnauthorizedExamCreation";
  }
}

/**
 * Thrown when no active ExamTemplate exists for the requested grade transition.
 * Validates: Requirement 2.2
 */
export class ExamTemplateNotFound extends Error {
  constructor(fromGrade: Grade, toGrade: Grade) {
    super(
      `No active ExamTemplate found for the transition ${fromGrade} → ${toGrade}.`,
    );
    this.name = "ExamTemplateNotFound";
  }
}

export interface PractitionerInfo {
  id: string;
  grade: Grade;
  instructorId: string;
}

export interface StartExamInput {
  practitionerId: string;
  instructorId: string;
  toGrade: Grade;
  discipline: Discipline;
  examDate: string; // ISO date (YYYY-MM-DD)
}

export interface StartExamDeps {
  examTemplateRepo: IExamTemplateRepository;
  gradeExamRepo: IGradeExamRepository;
  /** Returns the practitioner record or null if not found. */
  getPractitioner: (practitionerId: string) => Promise<PractitionerInfo | null>;
}

/**
 * Starts a new GradeExam for a practitioner.
 *
 * 1. Verifies the practitioner belongs to the authenticated instructor (Req 2.3).
 * 2. Loads the active ExamTemplate for the grade transition (Req 2.1, 2.2).
 * 3. Initializes a GradeExam with status "draft" and one GradeExamItem per
 *    template item with score = 0 (Req 2.4).
 * 4. Persists and returns the created GradeExam.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */
export async function startExam(
  input: StartExamInput,
  deps: StartExamDeps,
): Promise<GradeExam> {
  // Req 2.3 — Verify practitioner belongs to the authenticated instructor
  const practitioner = await deps.getPractitioner(input.practitionerId);
  if (!practitioner || practitioner.instructorId !== input.instructorId) {
    throw new UnauthorizedExamCreation(
      input.practitionerId,
      input.instructorId,
    );
  }

  // Req 2.1, 2.2 — Load active ExamTemplate for the grade transition
  const template = await deps.examTemplateRepo.findByGradeTransition(
    practitioner.grade,
    input.toGrade,
  );
  if (!template) {
    throw new ExamTemplateNotFound(practitioner.grade, input.toGrade);
  }

  const now = new Date().toISOString();
  const examId = crypto.randomUUID();

  // Req 2.4 — Initialize GradeExamItems with score = 0
  const items: GradeExamItem[] = template.items.map((templateItem) => ({
    id: crypto.randomUUID(),
    examId,
    templateItemId: templateItem.id,
    itemName: templateItem.name,
    maxScore: templateItem.maxScore,
    score: 0,
  }));

  const maxPossibleScore = items.reduce((sum, item) => sum + item.maxScore, 0);

  // Req 2.4 — Initialize GradeExam with status "draft"
  const exam: GradeExam = {
    id: examId,
    templateId: template.id,
    practitionerId: input.practitionerId,
    instructorId: input.instructorId,
    fromGrade: practitioner.grade,
    toGrade: input.toGrade,
    discipline: input.discipline,
    examDate: input.examDate,
    status: "draft",
    items,
    totalScore: 0,
    maxPossibleScore,
    scorePercentage: 0,
    calculatedResult: "failed",
    instructorOverride: false,
    overrideResult: null,
    overrideJustification: null,
    finalResult: "failed",
    authorizedBy: null,
    authorizedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  // Persist via repository
  await deps.gradeExamRepo.save(exam);

  return exam;
}
