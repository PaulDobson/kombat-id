import type { RefereePortalPublication } from "../../domain/entities/refereePortalPublication";
import type { RefereePortalPublicationRepository } from "../../domain/interfaces/refereePortalPublicationRepository";

/**
 * Lists all portal publications ordered by publication date descending.
 * Validates: Requisitos 7.5, 8.1
 */
export async function listPortalPublications(deps: {
  repo: RefereePortalPublicationRepository;
}): Promise<RefereePortalPublication[]> {
  return deps.repo.list();
}
