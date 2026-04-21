import { IEventRegistrationRepository } from "../../domain/interfaces/eventRegistrationRepository";
import { RegistrationNotFoundError } from "../../domain/errors";

export interface CancelRegistrationInput {
  adminId: string;
  registrationId: string;
}

export async function cancelRegistration(
  input: CancelRegistrationInput,
  repository: IEventRegistrationRepository,
): Promise<void> {
  const registration = await repository.findById(input.registrationId);

  if (!registration) {
    throw new RegistrationNotFoundError();
  }

  const now = new Date().toISOString();

  await repository.update({
    ...registration,
    status: "cancelada",
    cancelledAt: now,
    cancelledBy: input.adminId,
    updatedAt: now,
  });
}
