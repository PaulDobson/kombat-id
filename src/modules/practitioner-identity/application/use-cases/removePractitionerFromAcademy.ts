import { z } from "zod";
import type { AcademyMembershipRepository } from "../../domain/interfaces/academyMembershipRepository";
import {
  UnauthorizedError,
  MembershipNotFoundError,
} from "../../domain/errors";

export const RemovePractitionerFromAcademyInputSchema = z.object({
  adminId: z.string().uuid(),
  practitionerId: z.string().uuid(),
  leftAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type RemovePractitionerFromAcademyInput = z.infer<
  typeof RemovePractitionerFromAcademyInputSchema
>;

export async function removePractitionerFromAcademy(
  input: RemovePractitionerFromAcademyInput,
  deps: {
    membershipRepo: AcademyMembershipRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<void> {
  const validated = RemovePractitionerFromAcademyInputSchema.parse(input);

  if (!(await deps.isAdmin(validated.adminId))) {
    throw new UnauthorizedError();
  }

  const membership = await deps.membershipRepo.findActiveByPractitioner(
    validated.practitionerId,
  );
  if (!membership) throw new MembershipNotFoundError(validated.practitionerId);

  const leftAt = validated.leftAt ?? new Date().toISOString().slice(0, 10);
  await deps.membershipRepo.deactivate(membership.id, leftAt);
}
