import { z } from "zod";
import { randomUUID } from "crypto";
import type { RefereePortalPublicationRepository } from "../../domain/interfaces/refereePortalPublicationRepository";
import type { RefereeEventRegistrationRepository } from "../../domain/interfaces/refereeEventRegistrationRepository";
import {
  NotAnEventError,
  RegistrationDeadlinePassedError,
  AlreadyRegisteredForEventError,
  EventAtCapacityError,
} from "../../domain/errors";

export const RegisterForEventInput = z.object({
  publicationId: z.string().uuid(),
  refereeUserId: z.string().uuid(),
});

export type RegisterForEventInput = z.infer<typeof RegisterForEventInput>;

export async function registerForEvent(
  input: RegisterForEventInput,
  deps: {
    publicationRepo: RefereePortalPublicationRepository;
    registrationRepo: RefereeEventRegistrationRepository;
  },
): Promise<{ id: string }> {
  const { publicationRepo, registrationRepo } = deps;

  // 1. Verify publication exists and is an event
  const publication = await publicationRepo.findById(input.publicationId);
  if (!publication || !publication.isEvent) {
    throw new NotAnEventError(input.publicationId);
  }

  // 2. Check registration deadline
  if (publication.registrationDeadline) {
    const deadline = new Date(publication.registrationDeadline);
    deadline.setHours(23, 59, 59, 999); // end of deadline day
    if (new Date() > deadline) {
      throw new RegistrationDeadlinePassedError(input.publicationId);
    }
  }

  // 3. Check for duplicate registration
  const existing = await registrationRepo.findByPublicationAndReferee(
    input.publicationId,
    input.refereeUserId,
  );
  if (existing) {
    throw new AlreadyRegisteredForEventError(
      input.publicationId,
      input.refereeUserId,
    );
  }

  // 4. Check capacity
  if (publication.maxParticipants !== null) {
    const count = await registrationRepo.countByPublication(
      input.publicationId,
    );
    if (count >= publication.maxParticipants) {
      throw new EventAtCapacityError(input.publicationId);
    }
  }

  // 5. Create registration
  const now = new Date().toISOString();
  const id = randomUUID();
  await registrationRepo.save({
    id,
    publicationId: input.publicationId,
    refereeUserId: input.refereeUserId,
    registeredAt: now,
    createdAt: now,
  });

  return { id };
}
