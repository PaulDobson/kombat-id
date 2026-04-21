import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type {
  EventRegistration,
  RegistrationStatus,
} from "../../domain/entities/eventRegistration";
import type {
  IEventRegistrationRepository,
  RegistrationFilters,
  RegistrationWithDetails,
  StatusCounts,
} from "../../domain/interfaces/eventRegistrationRepository";

// ---------------------------------------------------------------------------
// Zod schemas for runtime validation
// ---------------------------------------------------------------------------

const EventRegistrationRowSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  practitioner_id: z.string(),
  instructor_id: z.string(),
  status: z.string(),
  registered_at: z.string(),
  confirmed_at: z.string().nullable(),
  confirmed_by: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  cancelled_by: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type EventRegistrationRow = z.infer<typeof EventRegistrationRowSchema>;

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleEventRegistrationRepository implements IEventRegistrationRepository {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<EventRegistration | null> {
    const { data, error } = await adminSupabase
      .from("event_registrations" as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find event registration by id: ${error.message}`,
      );
    if (!data) return null;

    return this.fromRow(data as EventRegistrationRow);
  }

  /**
   * Returns registrations for an event with practitioner and instructor names.
   * Fetches registrations and practitioners in two queries to avoid N+1.
   */
  async findByEvent(
    eventId: string,
    filters?: RegistrationFilters,
  ): Promise<RegistrationWithDetails[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = adminSupabase
      .from("event_registrations" as never)
      .select("*")
      .eq("event_id", eventId);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query.order("registered_at", {
      ascending: true,
    });

    if (error)
      throw new DomainError(
        `Failed to find registrations by event: ${error.message}`,
      );

    const rows = (data as EventRegistrationRow[]) ?? [];
    if (rows.length === 0) return [];

    // Collect unique practitioner IDs (practitioners + instructors)
    const practitionerIds = [
      ...new Set([
        ...rows.map((r) => r.practitioner_id),
        ...rows.map((r) => r.instructor_id),
      ]),
    ];

    const { data: practitioners, error: practitionersError } =
      await adminSupabase
        .from("practitioners")
        .select("id, full_name")
        .in("id", practitionerIds);

    if (practitionersError)
      throw new DomainError(
        `Failed to load practitioner names: ${practitionersError.message}`,
      );

    const nameById = new Map<string, string>(
      (practitioners ?? []).map((p) => [p.id, p.full_name]),
    );

    return rows.map((row) => ({
      ...this.fromRow(row),
      practitionerName: nameById.get(row.practitioner_id) ?? "",
      instructorName: nameById.get(row.instructor_id) ?? "",
    }));
  }

  async findByPractitionerAndEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<EventRegistration | null> {
    const { data, error } = await adminSupabase
      .from("event_registrations" as never)
      .select("*")
      .eq("practitioner_id", practitionerId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find registration by practitioner and event: ${error.message}`,
      );
    if (!data) return null;

    return this.fromRow(data as EventRegistrationRow);
  }

  /** Counts registrations with status = 'confirmada' for the given event. */
  async countConfirmedByEvent(eventId: string): Promise<number> {
    const { count, error } = await adminSupabase
      .from("event_registrations" as never)
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmada");

    if (error)
      throw new DomainError(
        `Failed to count confirmed registrations: ${error.message}`,
      );

    return count ?? 0;
  }

  /** Returns registration counts grouped by status for the given event. */
  async countByEventGroupedByStatus(eventId: string): Promise<StatusCounts> {
    const { data, error } = await adminSupabase
      .from("event_registrations" as never)
      .select("status")
      .eq("event_id", eventId);

    if (error)
      throw new DomainError(
        `Failed to count registrations by status: ${error.message}`,
      );

    const rows = (data as { status: string }[]) ?? [];

    const counts: StatusCounts = {
      pendiente_pago: 0,
      confirmada: 0,
      cancelada: 0,
    };

    for (const row of rows) {
      const status = row.status as RegistrationStatus;
      if (status in counts) {
        counts[status]++;
      }
    }

    return counts;
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async save(registration: EventRegistration): Promise<void> {
    const { error } = await adminSupabase
      .from("event_registrations" as never)
      .insert(this.toRow(registration) as never);

    if (error)
      throw new DomainError(
        `Failed to save event registration: ${error.message}`,
      );
  }

  async update(registration: EventRegistration): Promise<void> {
    const { error } = await adminSupabase
      .from("event_registrations" as never)
      .update({
        status: registration.status,
        confirmed_at: registration.confirmedAt,
        confirmed_by: registration.confirmedBy,
        cancelled_at: registration.cancelledAt,
        cancelled_by: registration.cancelledBy,
        notes: registration.notes,
        updated_at: registration.updatedAt,
      } as never)
      .eq("id", registration.id);

    if (error)
      throw new DomainError(
        `Failed to update event registration: ${error.message}`,
      );
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private fromRow(row: EventRegistrationRow): EventRegistration {
    const parsed = EventRegistrationRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `EventRegistration row failed schema validation: ${parsed.error.message}`,
      );
    }
    const d = parsed.data;
    return {
      id: d.id,
      eventId: d.event_id,
      practitionerId: d.practitioner_id,
      instructorId: d.instructor_id,
      status: d.status as RegistrationStatus,
      registeredAt: d.registered_at,
      confirmedAt: d.confirmed_at,
      confirmedBy: d.confirmed_by,
      cancelledAt: d.cancelled_at,
      cancelledBy: d.cancelled_by,
      notes: d.notes,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private toRow(registration: EventRegistration) {
    return {
      id: registration.id,
      event_id: registration.eventId,
      practitioner_id: registration.practitionerId,
      instructor_id: registration.instructorId,
      status: registration.status,
      registered_at: registration.registeredAt,
      confirmed_at: registration.confirmedAt,
      confirmed_by: registration.confirmedBy,
      cancelled_at: registration.cancelledAt,
      cancelled_by: registration.cancelledBy,
      notes: registration.notes,
      created_at: registration.createdAt,
      updated_at: registration.updatedAt,
    };
  }
}
