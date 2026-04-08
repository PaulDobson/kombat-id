import { z } from "zod";
import type { AcademyRepository } from "../../domain/interfaces/academyRepository";
import {
  UnauthorizedError,
  AcademyNotFoundError,
  AcademyAlreadyDeactivatedError,
} from "../../domain/errors";

export const DeactivateAcademyInputSchema = z.object({
  adminId: z.string().uuid(),
  academyId: z.string().uuid(),
  reason: z.string().min(1).max(500).trim(),
});

export type DeactivateAcademyInput = z.infer<
  typeof DeactivateAcademyInputSchema
>;

export async function deactivateAcademy(
  input: DeactivateAcademyInput,
  deps: {
    academyRepo: AcademyRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<void> {
  const validated = DeactivateAcademyInputSchema.parse(input);

  if (!(await deps.isAdmin(validated.adminId))) {
    throw new UnauthorizedError();
  }

  const academy = await deps.academyRepo.findById(validated.academyId);
  if (!academy) throw new AcademyNotFoundError(validated.academyId);
  if (!academy.isActive)
    throw new AcademyAlreadyDeactivatedError(validated.academyId);

  await deps.academyRepo.setActiveStatus(
    validated.academyId,
    false,
    validated.reason,
    validated.adminId,
  );
}
