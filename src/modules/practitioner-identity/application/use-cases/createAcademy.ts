import { z } from "zod";
import type { Academy, ChileanRegion } from "../../domain/entities/academy";
import type { AcademyRepository } from "../../domain/interfaces/academyRepository";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import {
  UnauthorizedError,
  InvalidInstructorRoleError,
} from "../../domain/errors";

export const CreateAcademyInputSchema = z.object({
  adminId: z.string().uuid(),
  name: z.string().min(1).max(200).trim(),
  region: z.enum([
    "arica_y_parinacota",
    "tarapaca",
    "antofagasta",
    "atacama",
    "coquimbo",
    "valparaiso",
    "metropolitana",
    "ohiggins",
    "maule",
    "nuble",
    "biobio",
    "araucania",
    "los_rios",
    "los_lagos",
    "aysen",
    "magallanes",
  ]),
  city: z.string().min(1).max(100).trim(),
  address: z.string().max(300).trim().optional(),
  foundedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  responsibleInstructorIds: z.array(z.string().uuid()).min(1),
});

export type CreateAcademyInput = z.infer<typeof CreateAcademyInputSchema>;

export async function createAcademy(
  input: CreateAcademyInput,
  deps: {
    academyRepo: AcademyRepository;
    practitionerRepo: PractitionerRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<{ academyId: string }> {
  const validated = CreateAcademyInputSchema.parse(input);

  if (!(await deps.isAdmin(validated.adminId))) {
    throw new UnauthorizedError();
  }

  // Req 10.3 — Validate each responsible instructor has the required role
  for (const instructorId of validated.responsibleInstructorIds) {
    const practitioner = await deps.practitionerRepo.findById(instructorId);
    if (
      !practitioner ||
      !practitioner.role ||
      !["instructor", "profesor", "maestro"].includes(practitioner.role)
    ) {
      throw new InvalidInstructorRoleError(instructorId);
    }
  }

  const now = new Date().toISOString();
  const academy: Academy = {
    id: crypto.randomUUID(),
    name: validated.name,
    region: validated.region as ChileanRegion,
    city: validated.city,
    address: validated.address ?? null,
    foundedDate: validated.foundedDate ?? null,
    isActive: true,
    deactivatedAt: null,
    deactivationReason: null,
    responsibleInstructorIds: validated.responsibleInstructorIds,
    createdBy: validated.adminId,
    updatedAt: now,
    createdAt: now,
  };

  await deps.academyRepo.save(academy);
  return { academyId: academy.id };
}
