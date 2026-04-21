import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { QrScanRepository } from "../../domain/interfaces/qrScanRepository";
import { PractitionerNotFoundError } from "../../domain/errors";

export interface QrVerificationResult {
  practitionerId: string;
  fullName: string;
  grade: string;
  isActive: boolean;
  photoPath: string | null;
}

export async function verifyByQrToken(
  token: string,
  deps: {
    practitionerRepo: PractitionerRepository;
    qrScanRepo: QrScanRepository;
    getSignedPhotoUrl?: (path: string) => Promise<string | null>;
  },
): Promise<QrVerificationResult> {
  const practitioner = await deps.practitionerRepo.findByQrToken(token);
  if (!practitioner) {
    throw new PractitionerNotFoundError(token);
  }

  await deps.qrScanRepo.recordScan(token, new Date());

  let photoPath: string | null = null;
  if (practitioner.photoPath && deps.getSignedPhotoUrl) {
    photoPath = await deps.getSignedPhotoUrl(practitioner.photoPath);
  }

  return {
    practitionerId: practitioner.id,
    fullName: practitioner.fullName,
    grade: practitioner.grade,
    isActive: practitioner.isActive,
    photoPath,
  };
}
