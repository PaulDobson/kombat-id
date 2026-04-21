import { IEventRegistrationRepository } from "../../domain/interfaces/eventRegistrationRepository";
import {
  RegistrationAlreadyConfirmedError,
  RegistrationNotFoundError,
} from "../../domain/errors";

export interface ConfirmPaymentInput {
  adminId: string;
  registrationId: string;
}

export async function confirmPayment(
  input: ConfirmPaymentInput,
  repository: IEventRegistrationRepository,
): Promise<void> {
  const { adminId, registrationId } = input;

  const registration = await repository.findById(registrationId);
  if (!registration) {
    throw new RegistrationNotFoundError();
  }

  if (registration.status === "confirmada") {
    throw new RegistrationAlreadyConfirmedError();
  }

  if (registration.status === "cancelada") {
    throw new Error("La inscripción está cancelada");
  }

  const now = new Date().toISOString();
  const updatedRegistration = {
    ...registration,
    status: "confirmada" as const,
    confirmedAt: now,
    confirmedBy: adminId,
    updatedAt: now,
  };

  await repository.update(updatedRegistration);
}
