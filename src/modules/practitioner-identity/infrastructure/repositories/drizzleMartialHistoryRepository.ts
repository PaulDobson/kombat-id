import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  MartialHistoryEntry,
  EventType,
  EventScope,
} from "../../domain/entities/martialHistoryEntry";
import type {
  MartialHistoryRepository,
  NewMartialHistoryEntry,
} from "../../domain/interfaces/martialHistoryRepository";

// ---------------------------------------------------------------------------
// Typed aliases
// ---------------------------------------------------------------------------

type MartialHistoryRow = Database["public"]["Tables"]["martial_history"]["Row"];

// ---------------------------------------------------------------------------
// Zod schema for validating rows read from the database (Requirements 8.4, 8.5)
// ---------------------------------------------------------------------------

const MartialHistoryRowSchema = z.object({
  id: z.string(),
  practitioner_id: z.string(),
  event_id: z.string().nullable(),
  event_type: z.enum(["competition", "seminar", "exam"]),
  event_date: z.string().min(1),
  result: z.string().nullable(),
  notes: z.string().nullable(),
  is_corrected: z.boolean(),
  correction_note: z.string().nullable(),
  corrected_at: z.string().nullable(),
  corrected_by: z.string().nullable(),
  recorded_by: z.string(),
  created_at: z.string().min(1),
  event_scope: z.enum(["national", "international"]).nullable().optional(),
  event_country: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleMartialHistoryRepository implements MartialHistoryRepository {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findByPractitionerId(publicId: string): Promise<MartialHistoryEntry[]> {
    const { data, error } = await adminSupabase
      .from("martial_history")
      .select("*")
      .eq("practitioner_id", publicId)
      .order("event_date", { ascending: false });

    if (error) {
      throw new DomainError(
        `Failed to find martial history for practitioner: ${error.message}`,
      );
    }

    return ((data as MartialHistoryRow[]) ?? []).map((row) =>
      this.fromRow(row),
    );
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async addEntry(entry: NewMartialHistoryEntry): Promise<MartialHistoryEntry> {
    const { data, error } = await adminSupabase
      .from("martial_history")
      .insert({
        practitioner_id: entry.practitionerId,
        event_id: entry.eventId,
        event_type: entry.eventType,
        event_date: entry.eventDate,
        result: entry.result,
        notes: entry.notes,
        recorded_by: entry.recordedBy,
        is_corrected: false,
        correction_note: null,
        corrected_at: null,
        corrected_by: null,
        created_at: new Date().toISOString(),
        event_scope: entry.eventScope ?? null,
        event_country: entry.eventCountry ?? null,
      } as unknown as never)
      .select()
      .single();

    if (error) {
      throw new DomainError(
        `Failed to add martial history entry: ${error.message}`,
      );
    }

    return this.fromRow(data as MartialHistoryRow);
  }

  async markCorrected(
    entryId: string,
    justification: string,
    adminId: string,
  ): Promise<void> {
    const { error } = await adminSupabase
      .from("martial_history")
      .update({
        is_corrected: true,
        correction_note: justification,
        corrected_at: new Date().toISOString(),
        corrected_by: adminId,
      } as unknown as never)
      .eq("id", entryId);

    if (error) {
      throw new DomainError(
        `Failed to mark martial history entry as corrected: ${error.message}`,
      );
    }
  }

  async existsForEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<boolean> {
    const { data, error } = await adminSupabase
      .from("martial_history")
      .select("id")
      .eq("practitioner_id", practitionerId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to check martial history entry existence: ${error.message}`,
      );
    }

    return data !== null;
  }

  // -------------------------------------------------------------------------
  // Private mapping helpers
  // -------------------------------------------------------------------------

  /**
   * Validates the raw DB row with Zod and maps it to a domain entity.
   * Throws a DomainError if the row does not match the expected schema (Requirements 8.4, 8.5).
   */
  private fromRow(row: MartialHistoryRow): MartialHistoryEntry {
    const parsed = MartialHistoryRowSchema.safeParse(row);

    if (!parsed.success) {
      throw new DomainError(
        `MartialHistory row failed schema validation: ${parsed.error.message}`,
      );
    }

    return this.toEntity(parsed.data as MartialHistoryRow);
  }

  private toEntity(row: MartialHistoryRow): MartialHistoryEntry {
    return {
      id: row.id,
      practitionerId: row.practitioner_id,
      eventId: row.event_id,
      eventType: row.event_type as EventType,
      eventDate: row.event_date,
      result: row.result,
      notes: row.notes,
      isCorrected: row.is_corrected,
      correctionNote: row.correction_note,
      correctedAt: row.corrected_at,
      correctedBy: row.corrected_by,
      recordedBy: row.recorded_by,
      createdAt: row.created_at,
      eventScope: (row.event_scope as EventScope) ?? null,
      eventCountry: row.event_country ?? null,
    };
  }
}
