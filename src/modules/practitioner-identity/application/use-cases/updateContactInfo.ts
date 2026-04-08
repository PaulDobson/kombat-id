import { z } from "zod";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";

export const UpdateContactInfoInputSchema = z.object({
  publicId: z.string().uuid(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
});

export type UpdateContactInfoInput = z.infer<
  typeof UpdateContactInfoInputSchema
>;

export async function updateContactInfo(
  input: UpdateContactInfoInput,
  deps: { practitionerRepo: PractitionerRepository },
): Promise<void> {
  UpdateContactInfoInputSchema.parse(input);

  const practitioner = await deps.practitionerRepo.findById(input.publicId);
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.publicId);
  }

  if (practitioner.isActive === false) {
    throw new PractitionerInactiveError(input.publicId);
  }

  const updatedPractitioner = {
    ...practitioner,
    contactPhone:
      input.contactPhone !== undefined
        ? input.contactPhone
        : practitioner.contactPhone,
    contactEmail:
      input.contactEmail !== undefined
        ? input.contactEmail
        : practitioner.contactEmail,
    updatedAt: new Date().toISOString(),
  };

  await deps.practitionerRepo.save(updatedPractitioner);
}
