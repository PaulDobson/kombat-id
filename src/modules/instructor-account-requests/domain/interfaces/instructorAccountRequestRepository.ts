// Domain interface — zero framework imports

import type {
  InstructorAccountRequest,
  InstructorAccountRequestStatus,
} from "../entities/instructorAccountRequest";

export interface InstructorAccountRequestFilter {
  status?: InstructorAccountRequestStatus;
  page?: number;
  pageSize?: number;
}

export interface InstructorAccountRequestRepository {
  findById(id: string): Promise<InstructorAccountRequest | null>;
  findByEmail(email: string): Promise<InstructorAccountRequest | null>;
  list(filter: InstructorAccountRequestFilter): Promise<{
    items: InstructorAccountRequest[];
    total: number;
  }>;
  save(request: InstructorAccountRequest): Promise<void>;
  updateStatus(
    id: string,
    status: InstructorAccountRequestStatus,
    meta: {
      adminId: string;
      authUserId?: string;
      timestamp: string;
    },
  ): Promise<void>;
  updateObservation(
    id: string,
    meta: {
      adminId: string;
      notes: string;
      timestamp: string;
    },
  ): Promise<void>;
}
