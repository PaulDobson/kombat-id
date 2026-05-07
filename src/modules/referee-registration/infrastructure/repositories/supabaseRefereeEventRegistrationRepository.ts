import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { RefereeEventRegistration } from "../../domain/entities/refereeEventRegistration";
import type {
  RefereeEventRegistrationRepository,
  RefereeEventRegistrationWithRefereeInfo,
} from "../../domain/interfaces/refereeEventRegistrationRepository";

// ---------------------------------------------------------------------------
// Row schema for runtime validation
// ---------------------------------------------------------------------------

const RefereeEventRegistrationRowSchema = z.object({
  id: z.string(),
  publication_id: z.string(),
  referee_user_id: z.string(),
  registered_at: z.string(),
  created_at: z.string(),
});

type RefereeEventRegistrationRow = z.infer<
  typeof RefereeEventRegistrationRowSchema
>;

const TABLE = "referee_event_registrations" as const;

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class SupabaseRefereeEventRegistrationRepository implements RefereeEventRegistrationRepository {
  async findById(id: string): Promise<RefereeEventRegistration | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find event registration by id: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as RefereeEventRegistrationRow);
  }

  async findByPublicationAndReferee(
    publicationId: string,
    refereeUserId: string,
  ): Promise<RefereeEventRegistration | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("publication_id", publicationId)
      .eq("referee_user_id", refereeUserId)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find event registration by publication and referee: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as RefereeEventRegistrationRow);
  }

  async findByPublication(
    publicationId: string,
  ): Promise<RefereeEventRegistrationWithRefereeInfo[]> {
    // Step 1: fetch registrations for this publication
    const { data: regData, error: regError } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("publication_id", publicationId)
      .order("registered_at", { ascending: true });

    if (regError) {
      throw new DomainError(
        `Failed to find event registrations by publication: ${regError.message}`,
      );
    }

    const rows = (regData as RefereeEventRegistrationRow[]) ?? [];
    if (rows.length === 0) return [];

    // Step 2: look up referee info from referee_registrations by auth_user_id
    const authUserIds = rows.map((r) => r.referee_user_id);

    const { data: refereeData, error: refereeError } = await adminSupabase
      .from("referee_registrations" as never)
      .select("auth_user_id, full_name, email")
      .in("auth_user_id", authUserIds);

    if (refereeError) {
      throw new DomainError(
        `Failed to fetch referee info for event registrations: ${refereeError.message}`,
      );
    }

    const refereeMap = new Map<string, { full_name: string; email: string }>(
      (
        (refereeData as Array<{
          auth_user_id: string;
          full_name: string;
          email: string;
        }>) ?? []
      ).map((r) => [
        r.auth_user_id,
        { full_name: r.full_name, email: r.email },
      ]),
    );

    return rows.map((row) => {
      const info = refereeMap.get(row.referee_user_id);
      return {
        ...this.toEntity(row),
        refereeName: info?.full_name ?? "Árbitro desconocido",
        refereeEmail: info?.email ?? "",
      };
    });
  }

  async findByReferee(
    refereeUserId: string,
  ): Promise<RefereeEventRegistration[]> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("referee_user_id", refereeUserId)
      .order("registered_at", { ascending: false });

    if (error) {
      throw new DomainError(
        `Failed to find event registrations by referee: ${error.message}`,
      );
    }

    const rows = (data as RefereeEventRegistrationRow[]) ?? [];
    return rows.map((row) => this.toEntity(row));
  }

  async countByPublication(publicationId: string): Promise<number> {
    const { count, error } = await adminSupabase
      .from(TABLE as never)
      .select("*", { count: "exact", head: true })
      .eq("publication_id", publicationId);

    if (error) {
      throw new DomainError(
        `Failed to count event registrations: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  async save(registration: RefereeEventRegistration): Promise<void> {
    const { error } = await adminSupabase
      .from(TABLE as never)
      .upsert(this.toRow(registration) as never, { onConflict: "id" });

    if (error) {
      throw new DomainError(
        `Failed to save event registration: ${error.message}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await adminSupabase
      .from(TABLE as never)
      .delete()
      .eq("id", id);

    if (error) {
      throw new DomainError(
        `Failed to delete event registration: ${error.message}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toEntity(row: RefereeEventRegistrationRow): RefereeEventRegistration {
    const parsed = RefereeEventRegistrationRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `RefereeEventRegistration row failed schema validation: ${parsed.error.message}`,
      );
    }
    const d = parsed.data;
    return {
      id: d.id,
      publicationId: d.publication_id,
      refereeUserId: d.referee_user_id,
      registeredAt: d.registered_at,
      createdAt: d.created_at,
    };
  }

  private toRow(entity: RefereeEventRegistration): RefereeEventRegistrationRow {
    return {
      id: entity.id,
      publication_id: entity.publicationId,
      referee_user_id: entity.refereeUserId,
      registered_at: entity.registeredAt,
      created_at: entity.createdAt,
    };
  }
}
