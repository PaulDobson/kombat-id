import { z } from "zod";
import type {
  Discipline,
  DisciplineGrade,
} from "../../domain/entities/disciplineGrade";
import type { DisciplineGradeRepository } from "../../domain/interfaces/disciplineGradeRepository";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import { PractitionerNotFoundError } from "../../domain/errors";

export const GetDisciplineGradeHistoryInputSchema = z.object({
  practitionerId: z.string().uuid(),
  discipline: z
    .enum([
      "kombat_taekwondo",
      "taekwondo_wtf",
      "hapkido",
      "kick_boxing",
      "defensa_personal",
    ])
    .optional(),
});

export type GetDisciplineGradeHistoryInput = z.infer<
  typeof GetDisciplineGradeHistoryInputSchema
>;

/**
 * Req 13.5 — Returns all grades (active and inactive) for a practitioner.
 * If discipline is provided, filters results to that discipline only.
 */
export async function getDisciplineGradeHistory(
  input: GetDisciplineGradeHistoryInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    disciplineGradeRepo: DisciplineGradeRepository;
  },
): Promise<DisciplineGrade[]> {
  GetDisciplineGradeHistoryInputSchema.parse(input);

  const practitioner = await deps.practitionerRepo.findById(
    input.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.practitionerId);
  }

  const allGrades = await deps.disciplineGradeRepo.findByPractitioner(
    input.practitionerId,
  );

  if (input.discipline) {
    const discipline = input.discipline as Discipline;
    return allGrades.filter((g) => g.discipline === discipline);
  }

  return allGrades;
}
