import { z } from "zod";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { AuditLogRepository } from "../../domain/interfaces/auditLogRepository";
import {
  PractitionerNotFoundError,
  UnauthorizedError,
} from "../../domain/errors";

export const RegenerateQrTokenInputSchema = z.object({
  publicId: z.string().uuid(),
  adminId: z.string().uuid(),
});

export type RegenerateQrTokenInput = z.infer<
  typeof RegenerateQrTokenInputSchema
>;

export async function regenerateQrToken(
  input: RegenerateQrTokenInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    auditLogRepo: AuditLogRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<{ token: string }> {
  RegenerateQrTokenInputSchema.parse(input);

  const adminAllowed = await deps.isAdmin(input.adminId);
  if (!adminAllowed) {
    throw new UnauthorizedError(
      "Only administrators can regenerate a QR token",
    );
  }

  const practitioner = await deps.practitionerRepo.findById(input.publicId);
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.publicId);
  }

  const newToken = await deps.practitionerRepo.regenerateQrToken(
    input.publicId,
    input.adminId,
  );

  await deps.auditLogRepo.log({
    adminId: input.adminId,
    action: "REGENERATE_QR_TOKEN",
    targetType: "practitioner",
    targetId: input.publicId,
  });

  return { token: newToken };
}
