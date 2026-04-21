import type {
  ExamTemplate,
  Grade,
  Discipline,
} from "../../domain/entities/examTemplate";
import {
  validateMinimumPassScore,
  validateItemMaxScore,
} from "../../domain/entities/examTemplate";
import type { IExamTemplateRepository } from "../../domain/interfaces/examTemplateRepository";

export class DuplicateExamTemplate extends Error {
  constructor(fromGrade: Grade, toGrade: Grade) {
    super(
      `An active ExamTemplate already exists for the transition ${fromGrade} → ${toGrade}`,
    );
    this.name = "DuplicateExamTemplate";
  }
}

export interface ConfigureExamTemplateInput {
  fromGrade: Grade;
  toGrade: Grade;
  discipline: Discipline;
  minimumPassScore: number;
  requiresAdminAuth: boolean;
  items: Array<{
    name: string;
    description?: string | null;
    maxScore: number;
    order: number;
  }>;
  createdBy: string;
}

/**
 * Req 1.1, 1.2, 1.6, 1.7, 1.8 — Configures a new ExamTemplate for a grade transition.
 * Validates minimumPassScore in [0,100], each item's maxScore > 0, and uniqueness of
 * active template per (fromGrade, toGrade) before persisting.
 */
export async function configureExamTemplate(
  input: ConfigureExamTemplateInput,
  deps: { examTemplateRepo: IExamTemplateRepository },
): Promise<ExamTemplate> {
  // Req 1.7 — Validate minimumPassScore in [0, 100]
  validateMinimumPassScore(input.minimumPassScore);

  // Req 1.8 — Validate each item's maxScore > 0
  for (const item of input.items) {
    validateItemMaxScore(item.maxScore);
  }

  // Req 1.2, 1.6 — Ensure no active template exists for this grade transition
  const existing = await deps.examTemplateRepo.findByGradeTransition(
    input.fromGrade,
    input.toGrade,
  );
  if (existing && existing.isActive) {
    throw new DuplicateExamTemplate(input.fromGrade, input.toGrade);
  }

  const now = new Date().toISOString();
  const templateId = crypto.randomUUID();

  const template: ExamTemplate = {
    id: templateId,
    fromGrade: input.fromGrade,
    toGrade: input.toGrade,
    discipline: input.discipline,
    minimumPassScore: input.minimumPassScore,
    requiresAdminAuth: input.requiresAdminAuth,
    isActive: true,
    items: input.items.map((item) => ({
      id: crypto.randomUUID(),
      templateId,
      name: item.name,
      description: item.description ?? null,
      maxScore: item.maxScore,
      order: item.order,
    })),
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  // Req 1.1 — Persist via repository
  await deps.examTemplateRepo.save(template);

  return template;
}
