import type { CertificationRepository } from "../../domain/interfaces/certificationRepository";
import { CertificationNotFoundError } from "../../domain/errors";

export interface CertificationVerificationResult {
  practitionerName: string; // from snapshot, NOT from current profile
  certType: string;
  issuedAt: string;
  isRevoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
}

export async function verifyCertification(
  certId: string,
  deps: { certificationRepo: CertificationRepository },
): Promise<CertificationVerificationResult> {
  const cert = await deps.certificationRepo.findById(certId);

  if (!cert) {
    throw new CertificationNotFoundError(certId);
  }

  return {
    practitionerName: cert.practitionerSnapshot.fullName,
    certType: cert.certType,
    issuedAt: cert.issuedAt,
    isRevoked: cert.isRevoked,
    revokedAt: cert.revokedAt,
    revocationReason: cert.revocationReason,
  };
}
