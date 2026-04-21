import type { ExamStatus } from "../entities/gradeExam";
import type { GradeExam } from "../entities/gradeExam";

/**
 * Optional filters for querying grade exams.
 */
export interface ExamFilters {
  status?: ExamStatus;
}

/**
 * Repository interface for GradeExam persistence operations.
 *
 * Validates: Requirements 6.1, 10.3
 */
export interface IGradeExamRepository {
  findById(id: string): Promise<GradeExam | null>;
  findByPractitioner(practitionerId: string): Promise<GradeExam[]>;
  findByInstructor(
    instructorId: string,
    filters?: ExamFilters,
  ): Promise<GradeExam[]>;
  findPendingAuthorization(): Promise<GradeExam[]>;
  save(exam: GradeExam): Promise<void>;
  update(exam: GradeExam): Promise<void>;
}
