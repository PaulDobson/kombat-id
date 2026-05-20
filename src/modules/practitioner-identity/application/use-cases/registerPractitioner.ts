import { z } from "zod";
import type { Practitioner } from "../../domain/entities/practitioner";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import { DuplicateRutError } from "../../domain/errors";

export const RegisterPractitionerInputSchema = z.object({
  rut: z.string().min(1),
  fullName: z.string().min(1).max(200).trim(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["male", "female", "other"]),
  grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().int().min(50).max(250).optional(),
  authUserId: z.string().uuid().optional(),
  contactEmail: z.string().email().optional().nullable(),
  addressStreet: z.string().max(200).optional().nullable(),
  addressCity: z.string().max(100).optional().nullable(),
  addressRegion: z.string().max(100).optional().nullable(),
  instructorId: z.string().uuid().optional().nullable(),
  martialArt: z.string().max(100).optional().nullable(),
  martialGrade: z.string().max(100).optional().nullable(),
});

export type RegisterPractitionerInput = z.infer<
  typeof RegisterPractitionerInputSchema
>;

export async function registerPractitioner(
  input: RegisterPractitionerInput,
  deps: { practitionerRepo: PractitionerRepository },
): Promise<{ publicId: string }> {
  const validated = RegisterPractitionerInputSchema.parse(input);

  const existing = await deps.practitionerRepo.findByRut(validated.rut);
  if (existing) {
    throw new DuplicateRutError(validated.rut);
  }

  const now = new Date().toISOString();

  const practitioner: Practitioner = {
    id: crypto.randomUUID(),
    qrToken: crypto.randomUUID(),
    rut: validated.rut,
    fullName: validated.fullName,
    birthDate: validated.birthDate,
    gender: validated.gender,
    grade: validated.grade,
    startDate: validated.startDate,
    weightKg: validated.weightKg ?? null,
    heightCm: validated.heightCm ?? null,
    authUserId: validated.authUserId ?? null,
    isActive: true,
    dan: null,
    contactPhone: null,
    contactEmail: validated.contactEmail ?? null,
    photoPath: null,
    deactivatedAt: null,
    deactivationReason: null,
    addressStreet: validated.addressStreet ?? null,
    addressCity: validated.addressCity ?? null,
    addressRegion: validated.addressRegion ?? null,
    instructorId: validated.instructorId ?? null,
    certificatePath: null,
    martialArt: validated.martialArt ?? null,
    martialGrade: validated.martialGrade ?? null,
    updatedAt: now,
    createdAt: now,
  };

  await deps.practitionerRepo.save(practitioner);

  return { publicId: practitioner.id };
}
