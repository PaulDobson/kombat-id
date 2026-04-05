import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type { AcademyMembership } from "../../domain/entities/academy";
import type { AcademyMembershipRepository } from "../../domain/interfaces/academyMembershipRepository";

type MembershipRow = Database["public"]["Tables"]["academy_memberships"]["Row"];
type MembershipInsert =
  Database["public"]["Tables"]["academy_memberships"]["Insert"];

const MembershipRowSchema = z.object({
  id: z.string().uuid(),
  academy_id: z.string().uuid(),
  practitioner_id: z.string().uuid(),
  joined_at: z.string().min(1),
  left_at: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().min(1),
});

export class DrizzleAcademyMembershipRepository implements AcademyMembershipRepository {
  async findActiveByPractitioner(
    practitionerId: string,
  ): Promise<AcademyMembership | null> {
    const { data, error } = await adminSupabase
      .from("academy_memberships")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find active membership: ${error.message}`,
      );
    if (!data) return null;
    return this.fromRow(data as MembershipRow);
  }

  async findByAcademy(academyId: string): Promise<AcademyMembership[]> {
    const { data, error } = await adminSupabase
      .from("academy_memberships")
      .select("*")
      .eq("academy_id", academyId)
      .order("joined_at", { ascending: false });

    if (error)
      throw new DomainError(
        `Failed to find memberships by academy: ${error.message}`,
      );
    return ((data as MembershipRow[]) ?? []).map((row) => this.fromRow(row));
  }

  async hasActiveMembership(practitionerId: string): Promise<boolean> {
    const { count, error } = await adminSupabase
      .from("academy_memberships")
      .select("id", { count: "exact", head: true })
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true);

    if (error)
      throw new DomainError(
        `Failed to check active membership: ${error.message}`,
      );
    return (count ?? 0) > 0;
  }

  async save(membership: AcademyMembership): Promise<void> {
    const row = this.toRow(membership);
    const { error } = await adminSupabase
      .from("academy_memberships")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(row as any);

    if (error)
      throw new DomainError(`Failed to save membership: ${error.message}`);
  }

  async deactivate(membershipId: string, leftAt: string): Promise<void> {
    const { error } = await adminSupabase
      .from("academy_memberships")
      .update({ is_active: false, left_at: leftAt } as unknown as never)
      .eq("id", membershipId);

    if (error)
      throw new DomainError(
        `Failed to deactivate membership: ${error.message}`,
      );
  }

  private fromRow(row: MembershipRow): AcademyMembership {
    const parsed = MembershipRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `Membership row failed schema validation: ${parsed.error.message}`,
      );
    }
    return {
      id: parsed.data.id,
      academyId: parsed.data.academy_id,
      practitionerId: parsed.data.practitioner_id,
      joinedAt: parsed.data.joined_at,
      leftAt: parsed.data.left_at,
      isActive: parsed.data.is_active,
      createdAt: parsed.data.created_at,
    };
  }

  private toRow(membership: AcademyMembership): MembershipInsert {
    return {
      id: membership.id,
      academy_id: membership.academyId,
      practitioner_id: membership.practitionerId,
      joined_at: membership.joinedAt,
      left_at: membership.leftAt,
      is_active: membership.isActive,
      created_at: membership.createdAt,
    };
  }
}
