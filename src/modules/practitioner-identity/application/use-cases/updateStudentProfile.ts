import { z } from "zod";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";

export const UpdateStudentProfileInputSchema = z.object({
  publicId: z.string().uuid(),
  weightKg: z.number().positive().nullable().optional(),
  heightCm: z.number().int().min(50).max(250).nullable().optional(),
  contactPhone: z.string().max(30).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  addressStreet: z.string().max(200).nullable().optional(),
  addressCity: z.string().max(100).nullable().optional(),
  addressRegion: z.string().max(100).nullable().optional(),
});

export type UpdateStudentProfileInput = z.infer<
  typeof UpdateStudentProfileInputSchema
>;

export async function updateStudentProfile(
  input: UpdateStudentProfileInput,
  deps: { practitionerRepo: PractitionerRepository },
): Promise<void> {
  UpdateStudentProfileInputSchema.parse(input);

  const practitioner = await deps.practitionerRepo.findById(input.publicId);
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.publicId);
  }

  if (practitioner.isActive === false) {
    throw new PractitionerInactiveError(input.publicId);
  }

  const updatedPractitioner = {
    ...practitioner,
    // Patch parcial: undefined = no cambiar, null = limpiar
    weightKg:
      input.weightKg !== undefined ? input.weightKg : practitioner.weightKg,
    heightCm:
      input.heightCm !== undefined ? input.heightCm : practitioner.heightCm,
    contactPhone:
      input.contactPhone !== undefined
        ? input.contactPhone
        : practitioner.contactPhone,
    contactEmail:
      input.contactEmail !== undefined
        ? input.contactEmail
        : practitioner.contactEmail,
    addressStreet:
      input.addressStreet !== undefined
        ? input.addressStreet
        : practitioner.addressStreet,
    addressCity:
      input.addressCity !== undefined
        ? input.addressCity
        : practitioner.addressCity,
    addressRegion:
      input.addressRegion !== undefined
        ? input.addressRegion
        : practitioner.addressRegion,
    // Renovar updatedAt
    updatedAt: new Date().toISOString(),
    // Campos de identidad: NUNCA modificar (se copian del original implícitamente via spread,
    // pero los listamos explícitamente para dejar claro que no se tocan)
    // rut, fullName, birthDate, gender, grade, dan, role — ya incluidos en el spread
  };

  await deps.practitionerRepo.save(updatedPractitioner);
}
