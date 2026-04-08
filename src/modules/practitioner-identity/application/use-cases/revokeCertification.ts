import { z } from "zod";
import type { CertificationRepository } from "../../domain/interfaces/certificationRepository";
import {
  CertificationNotFoundError,
  CertificationAlreadyRevokedError,
  UnauthorizedError,
} from "../../domain/errors";

export const RevokeCertificationInputSchema = z.object({
  certId: z.string().uuid(),
  revokedBy: z.string().uuid(),
  revocationReason: z.string().min(1),
});

export type RevokeCertificationInput = z.infer<
  typeof RevokeCertificationInputSchema
>;

export async function revokeCertification(
  input: RevokeCertificationInput,
  deps: {
    certificationRepo: CertificationRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<void> {
  RevokeCertificationInputSchema.parse(input);

  const isAdmin = await deps.isAdmin(input.revokedBy);
  if (!isAdmin) {
    throw new UnauthorizedError();
  }

  const cert = await deps.certificationRepo.findById(input.certId);
  if (!cert) {
    throw new CertificationNotFoundError(input.certId);
  }

  if (cert.isRevoked) {
    throw new CertificationAlreadyRevokedError(input.certId);
  }

  await deps.certificationRepo.revoke(
    input.certId,
    input.revocationReason,
    input.revokedBy,
  );
}
