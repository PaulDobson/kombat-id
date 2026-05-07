import { z } from "zod";
import type { RefereeEventRegistrationRepository } from "../../domain/interfaces/refereeEventRegistrationRepository";
import { RefereeEventRegistrationNotFoundError } from "../../domain/errors";

export const UnregisterFromEventInput = z.object({
  publicationId: z.string().uuid(),
  refereeUserId: z.string().uuid(),
});

export type UnregisterFromEventInput = z.infer<typeof UnregisterFromEventInput>;

export async function unregisterFromEvent(
  input: UnregisterFromEventInput,
  deps: { registrationRepo: RefereeEventRegistrationRepository },
): Promise<void> {
  const { registrationRepo } = deps;

  const registration = await registrationRepo.findByPublicationAndReferee(
    input.publicationId,
    input.refereeUserId,
  );

  if (!registration) {
    throw new RefereeEventRegistrationNotFoundError(
      `${input.publicationId}:${input.refereeUserId}`,
    );
  }

  await registrationRepo.delete(registration.id);
}
