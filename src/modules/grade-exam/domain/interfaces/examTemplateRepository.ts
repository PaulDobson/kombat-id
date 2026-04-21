import type { Grade, ExamTemplate } from "../entities/examTemplate";

export interface IExamTemplateRepository {
  findById(id: string): Promise<ExamTemplate | null>;
  findByGradeTransition(
    fromGrade: Grade,
    toGrade: Grade,
  ): Promise<ExamTemplate | null>;
  findAll(): Promise<ExamTemplate[]>;
  save(template: ExamTemplate): Promise<void>;
  update(template: ExamTemplate): Promise<void>;
}
