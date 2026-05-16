import { z } from "zod";
import { isValidStatusTransition } from "../../domain/entities/instructorAccountRequest";
import type { InstructorAccountRequestRepository } from "../../domain/interfaces/instructorAccountRequestRepository";
import {
  InstructorAccountRequestNotFoundError,
  InvalidInstructorStatusTransitionError,
} from "../../domain/errors";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const RejectInstructorAccountRequestInput = z.object({
  requestId: z.string().uuid("El id de la solicitud debe ser un UUID válido"),
  adminId: z.string().uuid("El id del administrador debe ser un UUID válido"),
});

export type RejectInstructorAccountRequestInput = z.infer<
  typeof RejectInstructorAccountRequestInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Rejects a pending instructor account request.
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6
 */
export async function rejectInstructorAccountRequest(
  input: RejectInstructorAccountRequestInput,
  deps: { repo: InstructorAccountRequestRepository },
): Promise<void> {
  const { repo } = deps;

  const request = await repo.findById(input.requestId);
  if (!request) {
    throw new InstructorAccountRequestNotFoundError(input.requestId);
  }

  if (!isValidStatusTransition(request.status, "rejected")) {
    throw new InvalidInstructorStatusTransitionError(
      request.status,
      "rejected",
    );
  }

  const now = new Date().toISOString();
  await repo.updateStatus(input.requestId, "rejected", {
    adminId: input.adminId,
    timestamp: now,
  });
}
