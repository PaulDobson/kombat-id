import { z } from "zod";
import type { Practitioner } from "../../domain/entities/practitioner";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";

export const SearchPractitionersInputSchema = z.object({
  name: z.string().optional(),
  rut: z.string().optional(),
  grade: z
    .enum(["white", "yellow", "green", "blue", "red", "black"])
    .optional(),
});

export type SearchPractitionersInput = z.infer<
  typeof SearchPractitionersInputSchema
>;

export async function searchPractitioners(
  input: SearchPractitionersInput,
  deps: { practitionerRepo: PractitionerRepository },
): Promise<Practitioner[]> {
  const parsed = SearchPractitionersInputSchema.parse(input);

  // Filter out undefined values for exactOptionalPropertyTypes compatibility
  const query: Record<string, string> = {};
  if (parsed.name !== undefined) query.name = parsed.name;
  if (parsed.rut !== undefined) query.rut = parsed.rut;
  if (parsed.grade !== undefined) query.grade = parsed.grade;

  return deps.practitionerRepo.search(query);
}
