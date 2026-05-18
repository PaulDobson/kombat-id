import { z } from "zod";
import { isValidStatusTransition } from "../../domain/entities/instructorAccountRequest";
import type { InstructorAccountRequestRepository } from "../../domain/interfaces/instructorAccountRequestRepository";
import {
  InstructorAccountRequestNotFoundError,
  InvalidInstructorStatusTransitionError,
  InstructorAuthUserCreationError,
} from "../../domain/errors";

// ---------------------------------------------------------------------------
// Auth service interface — injected as dependency (DIP)
// ---------------------------------------------------------------------------

export interface InstructorAuthService {
  /**
   * Creates a Supabase Auth user with role 'instructor' in app_metadata.
   * Returns the auth user id and a temporary password the admin can share
   * with the instructor so they can log in immediately.
   * If the user already exists, assigns the role if missing and returns the existing id.
   */
  inviteInstructorUser(
    email: string,
  ): Promise<{ authUserId: string; temporaryPassword: string }>;
}

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const ApproveInstructorAccountRequestInput = z.object({
  requestId: z.string().uuid("El id de la solicitud debe ser un UUID válido"),
  adminId: z.string().uuid("El id del administrador debe ser un UUID válido"),
});

export type ApproveInstructorAccountRequestInput = z.infer<
  typeof ApproveInstructorAccountRequestInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Approves a pending instructor account request.
 *
 * Invariant: if Auth user creation fails, the request status is NOT changed.
 *
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */
export async function approveInstructorAccountRequest(
  input: ApproveInstructorAccountRequestInput,
  deps: {
    repo: InstructorAccountRequestRepository;
    authService: InstructorAuthService;
  },
): Promise<{ temporaryPassword: string }> {
  const { repo, authService } = deps;

  const request = await repo.findById(input.requestId);
  if (!request) {
    throw new InstructorAccountRequestNotFoundError(input.requestId);
  }

  if (!isValidStatusTransition(request.status, "approved")) {
    throw new InvalidInstructorStatusTransitionError(
      request.status,
      "approved",
    );
  }

  // Create Auth user BEFORE updating the request status.
  // If this fails, the request remains 'pending' (invariant preserved).
  let authUserId: string;
  let temporaryPassword: string;
  try {
    const result = await authService.inviteInstructorUser(request.email);
    authUserId = result.authUserId;
    temporaryPassword = result.temporaryPassword;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new InstructorAuthUserCreationError(request.email, reason);
  }

  const now = new Date().toISOString();
  await repo.updateStatus(input.requestId, "approved", {
    adminId: input.adminId,
    authUserId,
    timestamp: now,
  });

  return { temporaryPassword };
}
