import type { InstructorAccountRequest } from "../../domain/entities/instructorAccountRequest";
import type { InstructorAccountRequestRepository } from "../../domain/interfaces/instructorAccountRequestRepository";
import { InstructorAccountRequestNotFoundError } from "../../domain/errors";

/**
 * Retrieves an instructor account request by id.
 * Throws InstructorAccountRequestNotFoundError if not found.
 * Validates: Requirements 3.2, 3.6
 */
export async function getInstructorAccountRequestById(
  id: string,
  deps: { repo: InstructorAccountRequestRepository },
): Promise<InstructorAccountRequest> {
  const request = await deps.repo.findById(id);
  if (!request) {
    throw new InstructorAccountRequestNotFoundError(id);
  }
  return request;
}
