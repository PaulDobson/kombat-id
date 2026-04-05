import type { Grade } from "./practitioner";

export type CertType =
  | "technical_grade"
  | "instructor"
  | "referee"
  | "coach"
  | "event_participation";

export interface PractitionerSnapshot {
  id: string;
  fullName: string;
  rut: string;
  grade: Grade;
  dan: number | null;
  snapshotAt: string;
}

export interface Certification {
  id: string;
  practitionerId: string;
  certType: CertType;
  issuedAt: string;
  issuedBy: string; // admin UUID
  isRevoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  revokedBy: string | null;
  practitionerSnapshot: PractitionerSnapshot;
  notes: string | null;
}
