import type { RefereeRegistration } from "../../domain/entities/refereeRegistration";
import type { RefereeRegistrationRepository } from "../../domain/interfaces/refereeRegistrationRepository";
import { RefereeRegistrationNotFoundError } from "../../domain/errors";

/**
 * Retrieves the referee registration linked to the authenticated user.
 * Throws RefereeRegistrationNotFoundError if no registration is found.
 */
export async function getRefereeProfile(
  authUserId: string,
  deps: { repo: RefereeRegistrationRepository },
): Promise<RefereeRegistration> {
  const registration = await deps.repo.findByAuthUserId(authUserId);
  if (!registration) {
    throw new RefereeRegistrationNotFoundError(authUserId);
  }
  return registration;
}
