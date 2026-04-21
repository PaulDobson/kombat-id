import { describe, it, beforeEach } from "vitest";
import fc from "fast-check";
import {
  cancelRegistration,
  CancelRegistrationInput,
} from "./cancelRegistration";
import { RegistrationNotFoundError } from "../../domain/errors";
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
// In-memory mock repository
// ---------------------------------------------------------------------------

class InMemoryEventRegistrationRepository implements IEventRegistrationRepository {
  private registrations: Map<string, EventRegistration> = new Map();

  reset() {
    this.registrations.clear();
  }

  async findById(id: string): Promise<EventRegistration | null> {
    return this.registrations.get(id) ?? null;
  }

  async findByEvent(
    eventId: string,
    filters?: RegistrationFilters,
  ): Promise<RegistrationWithDetails[]> {
    const results: RegistrationWithDetails[] = [];
    for (const reg of this.registrations.values()) {
      if (reg.eventId !== eventId) continue;
      if (filters?.status && reg.status !== filters.status) continue;
      results.push({
        ...reg,
        practitionerName: `Practitioner-${reg.practitionerId}`,
        instructorName: `Instructor-${reg.instructorId}`,
      });
    }
    return results.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
  }

  async findByPractitionerAndEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<EventRegistration | null> {
    for (const reg of this.registrations.values()) {
      if (reg.practitionerId === practitionerId && reg.eventId === eventId) {
        return reg;
      }
    }
    return null;
  }

  async countConfirmedByEvent(eventId: string): Promise<number> {
    let count = 0;
    for (const reg of this.registrations.values()) {
      if (reg.eventId === eventId && reg.status === "confirmada") count++;
    }
    return count;
  }

  async countByEventGroupedByStatus(eventId: string): Promise<StatusCounts> {
    const counts: StatusCounts = {
      pendiente_pago: 0,
      confirmada: 0,
      cancelada: 0,
    };
    for (const reg of this.registrations.values()) {
      if (reg.eventId !== eventId) continue;
      counts[reg.status]++;
    }
    return counts;
  }

  async save(registration: EventRegistration): Promise<void> {
    this.registrations.set(registration.id, { ...registration });
  }

  async update(registration: EventRegistration): Promise<void> {
    if (!this.registrations.has(registration.id)) {
      throw new Error(`Registration not found: ${registration.id}`);
    }
    this.registrations.set(registration.id, { ...registration });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistration(
  id: string,
  eventId: string,
  practitionerId: string,
  status: RegistrationStatus,
): EventRegistration {
  const now = new Date().toISOString();
  return {
    id,
    eventId,
    practitionerId,
    instructorId: "instructor-seed",
    status,
    registeredAt: now,
    confirmedAt: status === "confirmada" ? now : null,
    confirmedBy: status === "confirmada" ? "admin-seed" : null,
    cancelledAt: status === "cancelada" ? now : null,
    cancelledBy: status === "cancelada" ? "admin-seed" : null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

const uuidArb = fc.uuid();

// ---------------------------------------------------------------------------
// Property 17: Cancellation transition
// ---------------------------------------------------------------------------

describe("cancelRegistration — Property 17: Cancellation transition", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 17: Cancellation transition
  // Validates: Requirements 5.6
  it("after cancelling a 'pendiente_pago' or 'confirmada' registration, status is 'cancelada' and cancelled_at is non-null", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        fc.constantFrom("pendiente_pago" as const, "confirmada" as const),
        async (
          registrationId,
          eventId,
          practitionerId,
          adminId,
          initialStatus,
        ) => {
          repo.reset();

          const registration = makeRegistration(
            registrationId,
            eventId,
            practitionerId,
            initialStatus,
          );
          await repo.save(registration);

          const input: CancelRegistrationInput = {
            adminId,
            registrationId,
          };

          await cancelRegistration(input, repo);

          const updated = await repo.findById(registrationId);

          if (updated === null) return false;

          return (
            updated.status === "cancelada" &&
            updated.cancelledAt !== null &&
            typeof updated.cancelledAt === "string" &&
            updated.cancelledAt.length > 0 &&
            updated.cancelledBy === adminId
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: event-registration-system, Property 17: Cancellation transition (not-found guard)
  // Validates: Requirements 5.6
  it("cancelling a non-existent registration throws RegistrationNotFoundError", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (nonExistentId, adminId) => {
        repo.reset();

        const input: CancelRegistrationInput = {
          adminId,
          registrationId: nonExistentId,
        };

        let threwNotFound = false;
        try {
          await cancelRegistration(input, repo);
        } catch (err) {
          if (err instanceof RegistrationNotFoundError) {
            threwNotFound = true;
          } else {
            throw err;
          }
        }

        const record = await repo.findById(nonExistentId);

        return threwNotFound && record === null;
      }),
      { numRuns: 100 },
    );
  });
});
