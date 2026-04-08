import type { AcademyMembership } from "../entities/academy";

export interface AcademyMembershipRepository {
  findActiveByPractitioner(
    practitionerId: string,
  ): Promise<AcademyMembership | null>;
  findByAcademy(academyId: string): Promise<AcademyMembership[]>;
  /** Req 10.5 — Verifica si el practicante ya tiene membresía activa en cualquier academia */
  hasActiveMembership(practitionerId: string): Promise<boolean>;
  save(membership: AcademyMembership): Promise<void>;
  deactivate(membershipId: string, leftAt: string): Promise<void>;
}
