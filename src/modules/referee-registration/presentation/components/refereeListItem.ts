// Presentation DTO — structurally excludes sensitive fields from RefereeRegistration.
// Validates: Requisitos 2.2, 2.3

import type { RefereeRegistration } from "../../domain/entities/refereeRegistration";

/**
 * Serializable DTO containing only the fields needed to render a referee card.
 * Sensitive fields (email, authUserId, certificatePath, approvedBy, rejectedAt,
 * rejectedBy) are structurally absent — they are not part of this type at all.
 */
export interface RefereeListItem {
  id: string;
  fullName: string;
  country: string;
  registrationNumber: string;
  approvedAt: string | null;
}

/**
 * Maps a `RefereeRegistration` domain entity to a `RefereeListItem` DTO.
 *
 * Only the five fields required by the UI are copied. All sensitive fields
 * (email, authUserId, certificatePath, approvedBy, rejectedAt, rejectedBy)
 * are excluded structurally — the returned object never contains them.
 */
export function toRefereeListItem(
  registration: RefereeRegistration,
): RefereeListItem {
  return {
    id: registration.id,
    fullName: registration.fullName,
    country: registration.country,
    registrationNumber: registration.registrationNumber,
    approvedAt: registration.approvedAt,
  };
}
