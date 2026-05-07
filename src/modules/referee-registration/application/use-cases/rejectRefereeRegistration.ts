import { z } from "zod";
import { isValidStatusTransition } from "../../domain/entities/refereeRegistration";
import type { RefereeRegistrationRepository } from "../../domain/interfaces/refereeRegistrationRepository";
import {
  InvalidStatusTransitionError,
  RefereeRegistrationNotFoundError,
} from "../../domain/errors";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const RejectRefereeRegistrationInput = z.object({
  id: z.string().uuid("El id del registro debe ser un UUID válido"),
  adminId: z.string().uuid("El id del administrador debe ser un UUID válido"),
});

export type RejectRefereeRegistrationInput = z.infer<
  typeof RejectRefereeRegistrationInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Rejects a pending referee registration.
 *
 * Validates:
 *   - Propiedad 3: Transición de estado válida
 *   - Requisitos: 5.1, 5.2
 */
export async function rejectRefereeRegistration(
  input: RejectRefereeRegistrationInput,
  deps: { repo: RefereeRegistrationRepository },
): Promise<void> {
  const { repo } = deps;

  const registration = await repo.findById(input.id);
  if (!registration) {
    throw new RefereeRegistrationNotFoundError(input.id);
  }

  if (!isValidStatusTransition(registration.status, "rejected")) {
    throw new InvalidStatusTransitionError(registration.status, "rejected");
  }

  const now = new Date().toISOString();
  await repo.updateStatus(input.id, "rejected", {
    adminId: input.adminId,
    timestamp: now,
  });
}
