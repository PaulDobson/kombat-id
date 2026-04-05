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
  return deps.practitionerRepo.search(parsed);
}
