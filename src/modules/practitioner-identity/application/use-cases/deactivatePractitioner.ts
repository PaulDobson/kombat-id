import { z } from "zod";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { AuditLogRepository } from "../../domain/interfaces/auditLogRepository";
import {
  PractitionerNotFoundError,
  UnauthorizedError,
} from "../../domain/errors";

export const DeactivatePractitionerInputSchema = z.object({
  publicId: z.string().uuid(),
  adminId: z.string().uuid(),
  reason: z.string().min(1),
});

export type DeactivatePractitionerInput = z.infer<
  typeof DeactivatePractitionerInputSchema
>;

export async function deactivatePractitioner(
  input: DeactivatePractitionerInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    auditLogRepo: AuditLogRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<void> {
  DeactivatePractitionerInputSchema.parse(input);

  const adminAllowed = await deps.isAdmin(input.adminId);
  if (!adminAllowed) {
    throw new UnauthorizedError(
      "Only administrators can deactivate a practitioner",
    );
  }

  const practitioner = await deps.practitionerRepo.findById(input.publicId);
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.publicId);
  }

  await deps.practitionerRepo.setActiveStatus(
    input.publicId,
    false,
    input.reason,
    input.adminId,
  );

  await deps.auditLogRepo.log({
    adminId: input.adminId,
    action: "DEACTIVATE_PRACTITIONER",
    targetType: "practitioner",
    targetId: input.publicId,
    metadata: { reason: input.reason },
  });
}
