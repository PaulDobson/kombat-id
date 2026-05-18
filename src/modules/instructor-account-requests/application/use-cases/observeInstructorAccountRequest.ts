import { z } from "zod";
import type { InstructorAccountRequestRepository } from "../../domain/interfaces/instructorAccountRequestRepository";
import { InstructorAccountRequestNotFoundError } from "../../domain/errors";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const ObserveInstructorAccountRequestInput = z.object({
  requestId: z.string().uuid("El id de la solicitud debe ser un UUID válido"),
  adminId: z.string().uuid("El id del administrador debe ser un UUID válido"),
  observationNotes: z
    .string()
    .min(1, "Las notas de observación no pueden estar vacías")
    .max(
      1000,
      "Las notas de observación no pueden superar los 1000 caracteres",
    ),
});

export type ObserveInstructorAccountRequestInput = z.infer<
  typeof ObserveInstructorAccountRequestInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Records an observation on an instructor account request.
 * The repository's updateObservation method handles setting the status to "observed" internally.
 *
 * Validates: Requirements 6.4, 6.5, 6.6
 */
export async function observeInstructorAccountRequest(
  input: ObserveInstructorAccountRequestInput,
  deps: { repo: InstructorAccountRequestRepository },
): Promise<void> {
  const { repo } = deps;

  const request = await repo.findById(input.requestId);
  if (!request) {
    throw new InstructorAccountRequestNotFoundError(input.requestId);
  }

  const now = new Date().toISOString();
  await repo.updateObservation(input.requestId, {
    adminId: input.adminId,
    notes: input.observationNotes,
    timestamp: now,
  });
}
