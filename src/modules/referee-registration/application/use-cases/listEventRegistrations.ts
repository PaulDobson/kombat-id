import { z } from "zod";
import type { RefereePortalPublicationRepository } from "../../domain/interfaces/refereePortalPublicationRepository";
import type {
  RefereeEventRegistrationRepository,
  RefereeEventRegistrationWithRefereeInfo,
} from "../../domain/interfaces/refereeEventRegistrationRepository";
import { NotAnEventError } from "../../domain/errors";

export const ListEventRegistrationsInput = z.object({
  publicationId: z.string().uuid(),
});

export type ListEventRegistrationsInput = z.infer<
  typeof ListEventRegistrationsInput
>;

export async function listEventRegistrations(
  input: ListEventRegistrationsInput,
  deps: {
    publicationRepo: RefereePortalPublicationRepository;
    registrationRepo: RefereeEventRegistrationRepository;
  },
): Promise<RefereeEventRegistrationWithRefereeInfo[]> {
  const { publicationRepo, registrationRepo } = deps;

  const publication = await publicationRepo.findById(input.publicationId);
  if (!publication || !publication.isEvent) {
    throw new NotAnEventError(input.publicationId);
  }

  return registrationRepo.findByPublication(input.publicationId);
}
