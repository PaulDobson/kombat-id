import { z } from "zod";
import type { RefereeRegistrationRepository } from "../../domain/interfaces/refereeRegistrationRepository";
import { RefereeRegistrationNotFoundError } from "../../domain/errors";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const UpdateRefereeRegistrationInput = z.object({
  id: z.string().uuid("El id del registro debe ser un UUID válido"),
  fullName: z
    .string()
    .min(2, "El nombre completo debe tener al menos 2 caracteres")
    .max(200, "El nombre completo no puede superar los 200 caracteres"),
  country: z
    .string()
    .min(1, "El país es obligatorio")
    .max(100, "El país no puede superar los 100 caracteres"),
  registrationNumber: z
    .string()
    .min(1, "El número de registro es obligatorio")
    .max(100, "El número de registro no puede superar los 100 caracteres"),
});

export type UpdateRefereeRegistrationInput = z.infer<
  typeof UpdateRefereeRegistrationInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Updates editable fields of a referee registration.
 * Email is NOT editable after submission.
 *
 * Validates: Requisitos 6.1, 6.2, 6.3, 6.4
 */
export async function updateRefereeRegistration(
  input: UpdateRefereeRegistrationInput,
  deps: { repo: RefereeRegistrationRepository },
): Promise<void> {
  const { repo } = deps;

  const registration = await repo.findById(input.id);
  if (!registration) {
    throw new RefereeRegistrationNotFoundError(input.id);
  }

  const now = new Date().toISOString();
  await repo.save({
    ...registration,
    fullName: input.fullName,
    country: input.country,
    registrationNumber: input.registrationNumber,
    updatedAt: now,
  });
}
