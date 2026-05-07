// Domain entity — zero framework imports

export type RefereeRegistrationStatus = "pending" | "approved" | "rejected";

export interface RefereeRegistration {
  id: string; // UUID
  email: string;
  fullName: string;
  country: string;
  registrationNumber: string;
  certificatePath: string | null; // path in Supabase Storage (optional)
  status: RefereeRegistrationStatus;
  authUserId: string | null; // linked on approval
  approvedAt: string | null; // ISO timestamp
  approvedBy: string | null; // UUID of the admin who approved
  rejectedAt: string | null; // ISO timestamp
  rejectedBy: string | null; // UUID of the admin who rejected
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Verifies whether a status transition is valid.
 *
 * Valid transitions:
 *   pending → approved
 *   pending → rejected
 *
 * All other transitions (including approved → rejected, rejected → approved,
 * any → pending) are invalid.
 *
 * Validates: Propiedad 3 — Transición de estado válida
 */
export function isValidStatusTransition(
  current: RefereeRegistrationStatus,
  next: RefereeRegistrationStatus,
): boolean {
  return current === "pending" && (next === "approved" || next === "rejected");
}
