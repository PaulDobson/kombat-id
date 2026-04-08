import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type { Academy, ChileanRegion } from "../../domain/entities/academy";
import type {
  AcademyRepository,
  AcademySearchQuery,
} from "../../domain/interfaces/academyRepository";

type AcademyRow = Database["public"]["Tables"]["academies"]["Row"];
type AcademyInsert = Database["public"]["Tables"]["academies"]["Insert"];

const AcademyRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  region: z.string().min(1),
  city: z.string().min(1),
  address: z.string().nullable(),
  founded_date: z.string().nullable(),
  is_active: z.boolean(),
  deactivated_at: z.string().nullable(),
  deactivation_reason: z.string().nullable(),
  responsible_instructor_ids: z.array(z.string().uuid()),
  created_by: z.string().uuid(),
  updated_at: z.string().min(1),
  created_at: z.string().min(1),
});

export class DrizzleAcademyRepository implements AcademyRepository {
  async findById(academyId: string): Promise<Academy | null> {
    const { data, error } = await adminSupabase
      .from("academies")
      .select("*")
      .eq("id", academyId)
      .maybeSingle();

    if (error)
      throw new DomainError(`Failed to find academy: ${error.message}`);
    if (!data) return null;
    return this.fromRow(data as AcademyRow);
  }

  async findAllActive(): Promise<Academy[]> {
    const { data, error } = await adminSupabase
      .from("academies")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error)
      throw new DomainError(
        `Failed to list active academies: ${error.message}`,
      );
    return ((data as AcademyRow[]) ?? []).map((row) => this.fromRow(row));
  }

  async search(query: AcademySearchQuery): Promise<Academy[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let builder: any = adminSupabase.from("academies").select("*");

    if (query.name) {
      builder = builder.ilike("name", `%${query.name}%`);
    }
    if (query.region) {
      builder = builder.eq("region", query.region);
    }
    if (query.city) {
      builder = builder.ilike("city", `%${query.city}%`);
    }

    const { data, error } = await builder.order("name", { ascending: true });
    if (error)
      throw new DomainError(`Failed to search academies: ${error.message}`);
    return ((data as AcademyRow[]) ?? []).map((row) => this.fromRow(row));
  }

  async save(academy: Academy): Promise<void> {
    const row = this.toRow(academy);
    const { error } = await adminSupabase
      .from("academies")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(row as any);

    if (error)
      throw new DomainError(`Failed to save academy: ${error.message}`);
  }

  async setActiveStatus(
    academyId: string,
    active: boolean,
    reason: string,
    _adminId: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await adminSupabase
      .from("academies")
      .update({
        is_active: active,
        deactivated_at: active ? null : now,
        deactivation_reason: active ? null : reason,
        updated_at: now,
      } as unknown as never)
      .eq("id", academyId);

    if (error)
      throw new DomainError(
        `Failed to update academy status: ${error.message}`,
      );
  }

  async countActivePractitioners(academyId: string): Promise<number> {
    const { count, error } = await adminSupabase
      .from("academy_memberships")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId)
      .eq("is_active", true);

    if (error)
      throw new DomainError(`Failed to count practitioners: ${error.message}`);
    return count ?? 0;
  }

  private fromRow(row: AcademyRow): Academy {
    const parsed = AcademyRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `Academy row failed schema validation: ${parsed.error.message}`,
      );
    }
    return {
      id: parsed.data.id,
      name: parsed.data.name,
      region: parsed.data.region as ChileanRegion,
      city: parsed.data.city,
      address: parsed.data.address,
      foundedDate: parsed.data.founded_date,
      isActive: parsed.data.is_active,
      deactivatedAt: parsed.data.deactivated_at,
      deactivationReason: parsed.data.deactivation_reason,
      responsibleInstructorIds: parsed.data.responsible_instructor_ids,
      createdBy: parsed.data.created_by,
      updatedAt: parsed.data.updated_at,
      createdAt: parsed.data.created_at,
    };
  }

  private toRow(academy: Academy): AcademyInsert {
    return {
      id: academy.id,
      name: academy.name,
      region: academy.region,
      city: academy.city,
      address: academy.address,
      founded_date: academy.foundedDate,
      is_active: academy.isActive,
      deactivated_at: academy.deactivatedAt,
      deactivation_reason: academy.deactivationReason,
      responsible_instructor_ids: academy.responsibleInstructorIds,
      created_by: academy.createdBy,
      updated_at: academy.updatedAt,
      created_at: academy.createdAt,
    };
  }
}
