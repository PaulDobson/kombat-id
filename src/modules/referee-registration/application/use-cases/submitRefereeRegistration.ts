import { z } from "zod";
import { randomUUID } from "crypto";
import type { RefereeRegistrationRepository } from "../../domain/interfaces/refereeRegistrationRepository";
import {
  DuplicateRefereeEmailError,
  DuplicateRegistrationNumberError,
} from "../../domain/errors";

// ---------------------------------------------------------------------------
// Input schema
// Validates: Propiedad 7 — Validación de campos obligatorios del formulario
// ---------------------------------------------------------------------------

export const SubmitRefereeRegistrationInput = z.object({
  email: z
    .string()
    .email("El email debe tener un formato válido")
    .max(254, "El email no puede superar los 254 caracteres"),
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
  certificatePath: z
    .string()
    .min(1, "La ruta del certificado es obligatoria")
    .nullable()
    .optional(),
});

export type SubmitRefereeRegistrationInput = z.infer<
  typeof SubmitRefereeRegistrationInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Submits a new referee registration with status 'pending'.
 *
 * Validates:
 *   - Propiedad 1: Unicidad de email en registros
 *   - Propiedad 2: Unicidad de número de registro oficial
 *   - Requisitos: 2.2, 2.4, 11.3
 */
export async function submitRefereeRegistration(
  input: SubmitRefereeRegistrationInput,
  deps: { repo: RefereeRegistrationRepository },
): Promise<{ id: string }> {
  const { repo } = deps;

  // Check email uniqueness — Propiedad 1
  const existingByEmail = await repo.findByEmail(input.email);
  if (existingByEmail) {
    throw new DuplicateRefereeEmailError(input.email);
  }

  // Check registration number uniqueness — Propiedad 2
  const existingByNumber = await repo.findByRegistrationNumber(
    input.registrationNumber,
  );
  if (existingByNumber) {
    throw new DuplicateRegistrationNumberError(input.registrationNumber);
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  await repo.save({
    id,
    email: input.email,
    fullName: input.fullName,
    country: input.country,
    registrationNumber: input.registrationNumber,
    certificatePath: input.certificatePath ?? null,
    status: "pending", // always pending on creation — Propiedad 7
    authUserId: null,
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    createdAt: now,
    updatedAt: now,
  });

  return { id };
}
