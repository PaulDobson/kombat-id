export type Grade = "white" | "yellow" | "green" | "blue" | "red" | "black";
export type Discipline = string;

export interface ExamTemplateItem {
  id: string;
  templateId: string;
  name: string;
  description: string | null;
  maxScore: number;
  order: number;
}

export interface ExamTemplate {
  id: string;
  fromGrade: Grade;
  toGrade: Grade;
  discipline: Discipline;
  minimumPassScore: number; // percentage [0, 100]
  requiresAdminAuth: boolean;
  isActive: boolean;
  items: ExamTemplateItem[];
  createdBy: string; // auth.users UUID
  createdAt: string;
  updatedAt: string;
}

/**
 * Req 1.7 — Validates that minimumPassScore is in the range [0, 100].
 * Throws if the score is outside the valid range.
 */
export function validateMinimumPassScore(score: number): void {
  if (score < 0 || score > 100) {
    throw new Error(
      `minimumPassScore must be in the range [0, 100], got ${score}`,
    );
  }
}

/**
 * Req 1.8 — Validates that an ExamTemplateItem's maxScore is greater than 0.
 * Throws if maxScore is not positive.
 */
export function validateItemMaxScore(maxScore: number): void {
  if (maxScore <= 0) {
    throw new Error(`maxScore must be greater than 0, got ${maxScore}`);
  }
}
