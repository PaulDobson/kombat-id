import { z } from "zod";
import type {
  Certification,
  PractitionerSnapshot,
} from "../../domain/entities/certification";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { CertificationRepository } from "../../domain/interfaces/certificationRepository";
import type { MasterLineageRepository } from "../../domain/interfaces/masterLineageRepository";
import {
  PractitionerNotFoundError,
  UnauthorizedError,
} from "../../domain/errors";
import { DomainError } from "@/lib/errors";

export const IssueCertificationInputSchema = z.object({
  practitionerId: z.string().uuid(),
  certType: z.enum([
    "technical_grade",
    "instructor",
    "referee",
    "coach",
    "event_participation",
  ]),
  issuedBy: z.string().uuid(),
  notes: z.string().optional().nullable(),
  certifyingMasterId: z.string().uuid().optional(),
});

export type IssueCertificationInput = z.infer<
  typeof IssueCertificationInputSchema
>;

export async function issueCertification(
  input: IssueCertificationInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    certificationRepo: CertificationRepository;
    isAdmin: (userId: string) => Promise<boolean>;
    masterLineageRepo?: MasterLineageRepository;
  },
): Promise<{ certId: string }> {
  IssueCertificationInputSchema.parse(input);

  const adminCheck = await deps.isAdmin(input.issuedBy);
  if (!adminCheck) {
    throw new UnauthorizedError("Only administrators can issue certifications");
  }

  const practitioner = await deps.practitionerRepo.findById(
    input.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.practitionerId);
  }

  // Req 9.5 — Para certificaciones de grado técnico, se requiere maestro certificador
  if (input.certType === "technical_grade") {
    if (!input.certifyingMasterId) {
      throw new DomainError(
        "A certifying master is required for technical grade certifications",
      );
    }

    // Req 9.7 — Verificar que el maestro certificador existe
    const certifyingMaster = await deps.practitionerRepo.findById(
      input.certifyingMasterId,
    );
    if (!certifyingMaster) {
      throw new DomainError(
        `Certifying master not found: ${input.certifyingMasterId}`,
      );
    }

    // Req 9.7 — Verificar que el maestro certificador tiene rol maestro o profesor
    const validRoles = ["maestro", "profesor"];
    if (!certifyingMaster.role || !validRoles.includes(certifyingMaster.role)) {
      throw new DomainError(
        `Practitioner ${input.certifyingMasterId} does not have the required role (maestro or profesor) to certify technical grades`,
      );
    }
  }

  const snapshot: PractitionerSnapshot = {
    id: practitioner.id,
    fullName: practitioner.fullName,
    rut: practitioner.rut,
    grade: practitioner.grade,
    dan: practitioner.dan,
    snapshotAt: new Date().toISOString(),
  };

  const cert: Certification = {
    id: crypto.randomUUID(),
    practitionerId: input.practitionerId,
    certType: input.certType,
    issuedAt: new Date().toISOString(),
    issuedBy: input.issuedBy,
    isRevoked: false,
    revokedAt: null,
    revocationReason: null,
    revokedBy: null,
    practitionerSnapshot: snapshot,
    notes: input.notes ?? null,
  };

  await deps.certificationRepo.save(cert);

  // Req 9.5 — Registrar entrada en master_lineage para certificaciones de grado técnico
  if (
    input.certType === "technical_grade" &&
    input.certifyingMasterId &&
    deps.masterLineageRepo
  ) {
    await deps.masterLineageRepo.addEntry({
      practitionerId: input.practitionerId,
      certifyingMasterId: input.certifyingMasterId,
      grade: practitioner.grade,
      dan: practitioner.dan,
      certificationId: cert.id,
      certifiedAt: cert.issuedAt,
    });
  }

  return { certId: cert.id };
}
