import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type {
  PublicationCategory,
  RefereePortalPublication,
} from "../../domain/entities/refereePortalPublication";
import type { RefereePortalPublicationRepository } from "../../domain/interfaces/refereePortalPublicationRepository";

// ---------------------------------------------------------------------------
// Row schema for runtime validation
// ---------------------------------------------------------------------------

const RefereePortalPublicationRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  category: z.string(),
  published_at: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  cover_image_path: z.string().nullable(),
  is_event: z.boolean(),
  event_date: z.string().nullable(),
  event_location: z.string().nullable(),
  max_participants: z.number().nullable(),
  registration_deadline: z.string().nullable(),
});

type RefereePortalPublicationRow = z.infer<
  typeof RefereePortalPublicationRowSchema
>;

const TABLE = "referee_portal_publications" as const;

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class SupabaseRefereePortalPublicationRepository implements RefereePortalPublicationRepository {
  async findById(id: string): Promise<RefereePortalPublication | null> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find portal publication by id: ${error.message}`,
      );
    }
    if (!data) return null;

    return this.toEntity(data as RefereePortalPublicationRow);
  }

  async list(): Promise<RefereePortalPublication[]> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      throw new DomainError(
        `Failed to list portal publications: ${error.message}`,
      );
    }

    const rows = (data as RefereePortalPublicationRow[]) ?? [];
    return rows.map((row) => this.toEntity(row));
  }

  async listEvents(): Promise<RefereePortalPublication[]> {
    const { data, error } = await adminSupabase
      .from(TABLE as never)
      .select("*")
      .eq("is_event", true)
      .order("event_date", { ascending: true });

    if (error) {
      throw new DomainError(
        `Failed to list portal publication events: ${error.message}`,
      );
    }

    const rows = (data as RefereePortalPublicationRow[]) ?? [];
    return rows.map((row) => this.toEntity(row));
  }

  async save(publication: RefereePortalPublication): Promise<void> {
    const { error } = await adminSupabase
      .from(TABLE as never)
      .upsert(this.toRow(publication) as never, { onConflict: "id" });

    if (error) {
      throw new DomainError(
        `Failed to save portal publication: ${error.message}`,
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
        `Failed to delete portal publication: ${error.message}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toEntity(row: RefereePortalPublicationRow): RefereePortalPublication {
    const parsed = RefereePortalPublicationRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `RefereePortalPublication row failed schema validation: ${parsed.error.message}`,
      );
    }
    const d = parsed.data;
    return {
      id: d.id,
      title: d.title,
      body: d.body,
      category: d.category as PublicationCategory,
      publishedAt: d.published_at,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      coverImagePath: d.cover_image_path,
      isEvent: d.is_event,
      eventDate: d.event_date,
      eventLocation: d.event_location,
      maxParticipants: d.max_participants,
      registrationDeadline: d.registration_deadline,
    };
  }

  private toRow(entity: RefereePortalPublication): RefereePortalPublicationRow {
    return {
      id: entity.id,
      title: entity.title,
      body: entity.body,
      category: entity.category,
      published_at: entity.publishedAt,
      created_by: entity.createdBy,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      cover_image_path: entity.coverImagePath,
      is_event: entity.isEvent,
      event_date: entity.eventDate,
      event_location: entity.eventLocation,
      max_participants: entity.maxParticipants,
      registration_deadline: entity.registrationDeadline,
    };
  }
}
