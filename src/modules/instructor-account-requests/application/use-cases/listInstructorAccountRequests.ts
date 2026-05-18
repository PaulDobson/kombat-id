import type { InstructorAccountRequest } from "../../domain/entities/instructorAccountRequest";
import type {
  InstructorAccountRequestFilter,
  InstructorAccountRequestRepository,
} from "../../domain/interfaces/instructorAccountRequestRepository";

/**
 * Lists instructor account requests with optional filtering and pagination.
 * Validates: Requirements 3.2, 3.6
 */
export async function listInstructorAccountRequests(
  filter: InstructorAccountRequestFilter,
  deps: { repo: InstructorAccountRequestRepository },
): Promise<{ items: InstructorAccountRequest[]; total: number }> {
  return deps.repo.list(filter);
}
