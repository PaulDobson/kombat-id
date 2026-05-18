import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type {
  InstructorAccountRequest,
  InstructorAccountRequestStatus,
} from "../../domain/entities/instructorAccountRequest";
import type {
  InstructorAccountRequestFilter,
  InstructorAccountRequestRepository,
} from "../../domain/interfaces/instructorAccountRequestRepository";

// ---------------------------------------------------------------------------
// Row schema for runtime validation
// Validates: Requirements 8.1, 8.2
// ---------------------------------------------------------------------------

const InstructorAccountRequestRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  rut: z.string(),
  phone: z.string().nullable(),
  academy_name: z.string().nullable(),
  message: z.string().nullable(),
  status: z.string(),
  auth_user_id: z.string().nullable(),
  approved_at: z.string().nullable(),
  approved_by: z.string().nullable(),
  rejected_at: z.string().nullable(),
  rejected_by: z.string().nullable(),
  observation_notes: z.string().nullable(),
  observed_at: z.string().nullable(),
  observed_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type InstructorAccountRequestRow = z.infer<
  typeof InstructorAccountRequestRowSchema
>;

const TABLE = "instructor_account_requests" as const;
const PAGE_SIZE_DEFAULT = 25;

// ---------------------------------------------------------------------------
// Repository implementation
// Validates: Requirements 8.1, 8.2, 8.4, 10.4, 10.5
// ---------------------------------------------------------------------------

export class SupabaseInstructorAccountRequestRepository implements InstructorAccountRequestRepository {
  async findById(id: string): Promise<InstructorAccountRequest | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find instructor account request by id: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as InstructorAccountRequestRow);
  }

  async findByEmail(email: string): Promise<InstructorAccountRequest | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find instructor account request by email: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as InstructorAccountRequestRow);
  }

  async list(
    filter: InstructorAccountRequestFilter,
  ): Promise<{ items: InstructorAccountRequest[]; total: number }> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? PAGE_SIZE_DEFAULT;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = adminSupabase
      .from(TABLE as never)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filter.status) {
      query = query.eq("status", filter.status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new DomainError(
        `Failed to list instructor account requests: ${error.message}`,
      );
    }

    const rows = (data as InstructorAccountRequestRow[]) ?? [];
    return {
      items: rows.map((row) => this.toEntity(row)),
      total: count ?? 0,
    };
  }

  async save(request: InstructorAccountRequest): Promise<void> {
    const { error } = await adminSupabase
      .from(TABLE as never)
      .upsert(this.toRow(request) as never, { onConflict: "id" });

    if (error) {
      throw new DomainError(
        `Failed to save instructor account request: ${error.message}`,
      );
    }
  }

  async updateStatus(
    id: string,
    status: InstructorAccountRequestStatus,
    meta: { adminId: string; authUserId?: string; timestamp: string },
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: meta.timestamp,
    };

    if (status === "approved") {
      updatePayload.approved_at = meta.timestamp;
      updatePayload.approved_by = meta.adminId;
      if (meta.authUserId) {
        updatePayload.auth_user_id = meta.authUserId;
      }
    } else if (status === "rejected") {
      updatePayload.rejected_at = meta.timestamp;
      updatePayload.rejected_by = meta.adminId;
    }

    const { error } = await adminSupabase
      .from(TABLE as never)
      .update(updatePayload as never)
      .eq("id", id);

    if (error) {
      throw new DomainError(
        `Failed to update instructor account request status: ${error.message}`,
      );
    }
  }

  async updateObservation(
    id: string,
    meta: { adminId: string; notes: string; timestamp: string },
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      status: "observed" as InstructorAccountRequestStatus,
      observation_notes: meta.notes,
      observed_by: meta.adminId,
      observed_at: meta.timestamp,
      updated_at: meta.timestamp,
    };

    const { error } = await adminSupabase
      .from(TABLE as never)
      .update(updatePayload as never)
      .eq("id", id);

    if (error) {
      throw new DomainError(
        `Failed to update instructor account request observation: ${error.message}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers — explicit mapping between DB rows and domain entities
  // snake_case (DB) ↔ camelCase (domain)
  // Validates: Propiedad 11 — Round-trip de serialización (Requirements 8.1, 8.2, 8.3)
  // ---------------------------------------------------------------------------

  private toEntity(row: InstructorAccountRequestRow): InstructorAccountRequest {
    const parsed = InstructorAccountRequestRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `InstructorAccountRequest row failed schema validation: ${parsed.error.message}`,
      );
    }
    const d = parsed.data;
    return {
      id: d.id,
      email: d.email,
      fullName: d.full_name,
      rut: d.rut,
      phone: d.phone,
      academyName: d.academy_name,
      message: d.message,
      status: d.status as InstructorAccountRequestStatus,
      authUserId: d.auth_user_id,
      approvedAt: d.approved_at,
      approvedBy: d.approved_by,
      rejectedAt: d.rejected_at,
      rejectedBy: d.rejected_by,
      observationNotes: d.observation_notes,
      observedAt: d.observed_at,
      observedBy: d.observed_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private toRow(entity: InstructorAccountRequest): InstructorAccountRequestRow {
    return {
      id: entity.id,
      email: entity.email,
      full_name: entity.fullName,
      rut: entity.rut,
      phone: entity.phone,
      academy_name: entity.academyName,
      message: entity.message,
      status: entity.status,
      auth_user_id: entity.authUserId,
      approved_at: entity.approvedAt,
      approved_by: entity.approvedBy,
      rejected_at: entity.rejectedAt,
      rejected_by: entity.rejectedBy,
      observation_notes: entity.observationNotes,
      observed_at: entity.observedAt,
      observed_by: entity.observedBy,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}
