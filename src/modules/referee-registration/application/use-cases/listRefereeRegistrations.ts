import type { RefereeRegistration } from "../../domain/entities/refereeRegistration";
import type {
  RefereeRegistrationFilter,
  RefereeRegistrationRepository,
} from "../../domain/interfaces/refereeRegistrationRepository";

/**
 * Lists referee registrations with optional filtering and pagination.
 * Validates: Requisitos 3.1, 3.2, 3.3, 3.4, 3.5
 */
export async function listRefereeRegistrations(
  filter: RefereeRegistrationFilter,
  deps: { repo: RefereeRegistrationRepository },
): Promise<{ items: RefereeRegistration[]; total: number }> {
  return deps.repo.list(filter);
}
