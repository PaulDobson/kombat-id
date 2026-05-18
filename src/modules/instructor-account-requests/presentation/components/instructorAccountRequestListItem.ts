// DTO for the admin list view — serializable fields only.
// Sensitive fields (authUserId, approvedBy, rejectedBy, observedBy) are
// intentionally excluded to avoid leaking internal audit data to the client.

import type { InstructorAccountRequestStatus } from "../../domain/entities/instructorAccountRequest";

export interface InstructorAccountRequestListItem {
  id: string;
  email: string;
  fullName: string;
  rut: string;
  phone: string | null;
  academyName: string | null;
  message: string | null;
  status: InstructorAccountRequestStatus;
  observationNotes: string | null;
  createdAt: string; // ISO string — serializable for Client Components
}
