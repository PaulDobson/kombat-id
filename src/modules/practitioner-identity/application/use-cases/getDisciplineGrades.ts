import { z } from "zod";
import type { DisciplineGrade } from "../../domain/entities/disciplineGrade";
import type { DisciplineGradeRepository } from "../../domain/interfaces/disciplineGradeRepository";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import { PractitionerNotFoundError } from "../../domain/errors";

export const GetDisciplineGradesInputSchema = z.object({
  practitionerId: z.string().uuid(),
});

export type GetDisciplineGradesInput = z.infer<
  typeof GetDisciplineGradesInputSchema
>;

/**
 * Req 13.6 — Returns all active discipline grades for a practitioner, ordered by discipline.
 */
export async function getDisciplineGrades(
  input: GetDisciplineGradesInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    disciplineGradeRepo: DisciplineGradeRepository;
  },
): Promise<DisciplineGrade[]> {
  GetDisciplineGradesInputSchema.parse(input);

  const practitioner = await deps.practitionerRepo.findById(
    input.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.practitionerId);
  }

  const grades = await deps.disciplineGradeRepo.findActiveByPractitioner(
    input.practitionerId,
  );

  return grades.sort((a, b) => a.discipline.localeCompare(b.discipline));
}
