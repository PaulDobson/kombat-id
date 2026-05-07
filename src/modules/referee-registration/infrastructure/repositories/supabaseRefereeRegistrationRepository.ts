import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type {
  RefereeRegistration,
  RefereeRegistrationStatus,
} from "../../domain/entities/refereeRegistration";
import type {
  RefereeRegistrationFilter,
  RefereeRegistrationRepository,
} from "../../domain/interfaces/refereeRegistrationRepository";

// ---------------------------------------------------------------------------
// Row schema for runtime validation
// ---------------------------------------------------------------------------

const RefereeRegistrationRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  country: z.string(),
  registration_number: z.string(),
  certificate_path: z.string().nullable(),
  status: z.string(),
  auth_user_id: z.string().nullable(),
  approved_at: z.string().nullable(),
  approved_by: z.string().nullable(),
  rejected_at: z.string().nullable(),
  rejected_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type RefereeRegistrationRow = z.infer<typeof RefereeRegistrationRowSchema>;

const TABLE = "referee_registrations" as const;
const PAGE_SIZE_DEFAULT = 25;

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class SupabaseRefereeRegistrationRepository implements RefereeRegistrationRepository {
  async findById(id: string): Promise<RefereeRegistration | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find referee registration by id: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as RefereeRegistrationRow);
  }

  async findByEmail(email: string): Promise<RefereeRegistration | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find referee registration by email: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as RefereeRegistrationRow);
  }

  async findByAuthUserId(
    authUserId: string,
  ): Promise<RefereeRegistration | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find referee registration by auth user id: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as RefereeRegistrationRow);
  }

  async findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<RefereeRegistration | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("registration_number", registrationNumber)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find referee registration by registration number: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as RefereeRegistrationRow);
  }

  async list(
    filter: RefereeRegistrationFilter,
  ): Promise<{ items: RefereeRegistration[]; total: number }> {
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
        `Failed to list referee registrations: ${error.message}`,
      );
    }

    const rows = (data as RefereeRegistrationRow[]) ?? [];
    return {
      items: rows.map((row) => this.toEntity(row)),
      total: count ?? 0,
    };
  }

  async save(registration: RefereeRegistration): Promise<void> {
    const { error } = await adminSupabase
      .from(TABLE as never)
      .upsert(this.toRow(registration) as never, { onConflict: "id" });

    if (error) {
      throw new DomainError(
        `Failed to save referee registration: ${error.message}`,
      );
    }
  }

  async updateStatus(
    id: string,
    status: RefereeRegistrationStatus,
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
        `Failed to update referee registration status: ${error.message}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers — explicit mapping between DB rows and domain entities
  // Validates: Propiedad 11 — Round-trip de serialización
  // ---------------------------------------------------------------------------

  private toEntity(row: RefereeRegistrationRow): RefereeRegistration {
    const parsed = RefereeRegistrationRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `RefereeRegistration row failed schema validation: ${parsed.error.message}`,
      );
    }
    const d = parsed.data;
    return {
      id: d.id,
      email: d.email,
      fullName: d.full_name,
      country: d.country,
      registrationNumber: d.registration_number,
      certificatePath: d.certificate_path,
      status: d.status as RefereeRegistrationStatus,
      authUserId: d.auth_user_id,
      approvedAt: d.approved_at,
      approvedBy: d.approved_by,
      rejectedAt: d.rejected_at,
      rejectedBy: d.rejected_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private toRow(entity: RefereeRegistration): RefereeRegistrationRow {
    return {
      id: entity.id,
      email: entity.email,
      full_name: entity.fullName,
      country: entity.country,
      registration_number: entity.registrationNumber,
      certificate_path: entity.certificatePath,
      status: entity.status,
      auth_user_id: entity.authUserId,
      approved_at: entity.approvedAt,
      approved_by: entity.approvedBy,
      rejected_at: entity.rejectedAt,
      rejected_by: entity.rejectedBy,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}
