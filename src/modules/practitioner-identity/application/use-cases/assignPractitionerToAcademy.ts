import { z } from "zod";
import type { AcademyMembership } from "../../domain/entities/academy";
import type { AcademyRepository } from "../../domain/interfaces/academyRepository";
import type { AcademyMembershipRepository } from "../../domain/interfaces/academyMembershipRepository";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import {
  UnauthorizedError,
  AcademyNotFoundError,
  AcademyInactiveError,
  PractitionerNotFoundError,
  PractitionerAlreadyInAcademyError,
} from "../../domain/errors";

export const AssignPractitionerToAcademyInputSchema = z.object({
  adminId: z.string().uuid(),
  practitionerId: z.string().uuid(),
  academyId: z.string().uuid(),
  joinedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type AssignPractitionerToAcademyInput = z.infer<
  typeof AssignPractitionerToAcademyInputSchema
>;

export async function assignPractitionerToAcademy(
  input: AssignPractitionerToAcademyInput,
  deps: {
    academyRepo: AcademyRepository;
    membershipRepo: AcademyMembershipRepository;
    practitionerRepo: PractitionerRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<{ membershipId: string }> {
  const validated = AssignPractitionerToAcademyInputSchema.parse(input);

  if (!(await deps.isAdmin(validated.adminId))) {
    throw new UnauthorizedError();
  }

  // Verify practitioner exists
  const practitioner = await deps.practitionerRepo.findById(
    validated.practitionerId,
  );
  if (!practitioner)
    throw new PractitionerNotFoundError(validated.practitionerId);

  // Req 10.7 — Verify academy exists and is active
  const academy = await deps.academyRepo.findById(validated.academyId);
  if (!academy) throw new AcademyNotFoundError(validated.academyId);
  if (!academy.isActive) throw new AcademyInactiveError(validated.academyId);

  // Req 10.5 — Verify practitioner doesn't already have an active membership
  const alreadyMember = await deps.membershipRepo.hasActiveMembership(
    validated.practitionerId,
  );
  if (alreadyMember)
    throw new PractitionerAlreadyInAcademyError(validated.practitionerId);

  const now = new Date().toISOString();
  const membership: AcademyMembership = {
    id: crypto.randomUUID(),
    academyId: validated.academyId,
    practitionerId: validated.practitionerId,
    joinedAt: validated.joinedAt ?? now.slice(0, 10),
    leftAt: null,
    isActive: true,
    createdAt: now,
  };

  await deps.membershipRepo.save(membership);
  return { membershipId: membership.id };
}
