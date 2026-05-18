import { z } from "zod";
import { randomUUID } from "crypto";
import type { InstructorAccountRequestRepository } from "../../domain/interfaces/instructorAccountRequestRepository";
import { DuplicateInstructorEmailError } from "../../domain/errors";

// ---------------------------------------------------------------------------
// Input schema
// Validates: Requirements 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11
// ---------------------------------------------------------------------------

export const SubmitInstructorAccountRequestInput = z.object({
  email: z
    .string()
    .email("El email debe tener un formato válido")
    .max(254, "El email no puede superar los 254 caracteres"),
  fullName: z
    .string()
    .min(2, "El nombre completo debe tener al menos 2 caracteres")
    .max(200, "El nombre completo no puede superar los 200 caracteres"),
  rut: z
    .string()
    .min(1, "El RUT es requerido")
    .max(12, "El RUT no puede superar los 12 caracteres")
    .regex(
      /^\d{1,8}-[\dkK]$/,
      "El RUT debe tener el formato 12345678-9 (sin puntos)",
    ),
  phone: z
    .string()
    .max(30, "El teléfono no puede superar los 30 caracteres")
    .nullable()
    .optional(),
  academyName: z
    .string()
    .max(200, "El nombre de la academia no puede superar los 200 caracteres")
    .nullable()
    .optional(),
  message: z
    .string()
    .max(1000, "El mensaje no puede superar los 1000 caracteres")
    .nullable()
    .optional(),
});

export type SubmitInstructorAccountRequestInput = z.infer<
  typeof SubmitInstructorAccountRequestInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Creates a new instructor account request with status 'pending'.
 *
 * Validates:
 *   - Requirement 1.2: Creates entity with status 'pending' and returns UUID
 *   - Requirement 1.5: Server-side Zod validation before any business logic
 *   - Requirement 1.11: Optional fields (phone, academyName, message) accepted as null/absent
 *   - Requirement 2.1: Checks email uniqueness (pending status) before persisting
 *   - Requirement 2.2: Throws DuplicateInstructorEmailError if email already exists with pending status
 */
export async function submitInstructorAccountRequest(
  input: SubmitInstructorAccountRequestInput,
  deps: { repo: InstructorAccountRequestRepository },
): Promise<{ id: string }> {
  const { repo } = deps;

  // Check email uniqueness — Requirement 2.1
  // findByEmail returns any existing request with this email (pending status check per Req 2.1)
  const existing = await repo.findByEmail(input.email);
  if (existing) {
    throw new DuplicateInstructorEmailError(input.email);
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  await repo.save({
    id,
    email: input.email,
    fullName: input.fullName,
    rut: input.rut,
    phone: input.phone ?? null,
    academyName: input.academyName ?? null,
    message: input.message ?? null,
    status: "pending", // always pending on creation — Requirement 1.2
    authUserId: null,
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    observationNotes: null,
    observedAt: null,
    observedBy: null,
    createdAt: now,
    updatedAt: now,
  });

  return { id };
}
