import type { RefereeRegistration } from "../../domain/entities/refereeRegistration";
import type { RefereeRegistrationRepository } from "../../domain/interfaces/refereeRegistrationRepository";
import { RefereeRegistrationNotFoundError } from "../../domain/errors";

/**
 * Retrieves a referee registration by id.
 * Throws RefereeRegistrationNotFoundError if not found.
 * Validates: Requisitos 3.1, 6.1, 9.1
 */
export async function getRefereeRegistrationById(
  id: string,
  deps: { repo: RefereeRegistrationRepository },
): Promise<RefereeRegistration> {
  const registration = await deps.repo.findById(id);
  if (!registration) {
    throw new RefereeRegistrationNotFoundError(id);
  }
  return registration;
}
