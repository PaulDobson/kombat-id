import { IEventRegistrationRepository } from "../../domain/interfaces/eventRegistrationRepository";
import {
  RegistrationNotFoundError,
  CannotDeleteConfirmedPaidError,
} from "../../domain/errors";

export interface DeleteStudentRegistrationInput {
  registrationId: string;
  instructorId: string;
  eventRegistrationFee: number | null;
}

/**
 * Use case: Delete (unenroll) a student registration
 *
 * Business rules:
 * - Only the instructor who created the registration can delete it
 * - Cannot delete confirmed registrations from paid events (fee > 0)
 * - Can delete pending registrations regardless of event fee
 * - Can delete confirmed registrations from free events (fee = 0 or null)
 * - Cannot delete already cancelled registrations
 * - Performs soft delete (status = "cancelada")
 */
export async function deleteStudentRegistration(
  input: DeleteStudentRegistrationInput,
  repository: IEventRegistrationRepository,
): Promise<void> {
  // 1. Fetch registration
  const registration = await repository.findById(input.registrationId);

  if (!registration) {
    throw new RegistrationNotFoundError();
  }

  // 2. Authorization: verify instructor owns this registration
  if (registration.instructorId !== input.instructorId) {
    // Deliberate 404 to avoid leaking existence
    throw new RegistrationNotFoundError();
  }

  // 3. Business rule: cannot delete already cancelled registrations
  if (registration.status === "cancelada") {
    throw new RegistrationNotFoundError(); // Treat as not found
  }

  // 4. Business rule: cannot delete confirmed paid registrations
  const isPaidEvent =
    input.eventRegistrationFee !== null && input.eventRegistrationFee > 0;

  if (registration.status === "confirmada" && isPaidEvent) {
    throw new CannotDeleteConfirmedPaidError();
  }

  // 5. Perform soft delete
  const now = new Date().toISOString();
  await repository.update({
    ...registration,
    status: "cancelada",
    cancelledAt: now,
    cancelledBy: input.instructorId,
    updatedAt: now,
  });
}
