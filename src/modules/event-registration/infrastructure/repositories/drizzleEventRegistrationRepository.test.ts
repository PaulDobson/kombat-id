import { describe, it, beforeEach } from "vitest";
import fc from "fast-check";
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
// In-memory mock repository implementing IEventRegistrationRepository
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

  /**
   * Enforces UNIQUE constraint on (event_id, practitioner_id).
   * Throws if a registration for the same pair already exists.
   */
  async save(registration: EventRegistration): Promise<void> {
    const existing = await this.findByPractitionerAndEvent(
      registration.practitionerId,
      registration.eventId,
    );
    if (existing !== null) {
      throw new Error(
        `UNIQUE constraint violation: (event_id, practitioner_id) = (${registration.eventId}, ${registration.practitionerId})`,
      );
    }
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
  overrides: Partial<EventRegistration> & {
    id: string;
    eventId: string;
    practitionerId: string;
  },
): EventRegistration {
  return {
    instructorId: "instructor-1",
    status: "pendiente_pago",
    registeredAt: new Date().toISOString(),
    confirmedAt: null,
    confirmedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Arbitraries
const statusArb = fc.constantFrom<RegistrationStatus>(
  "pendiente_pago",
  "confirmada",
  "cancelada",
);

const uuidArb = fc.uuid();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InMemoryEventRegistrationRepository — Property 18: Status counts sum to total", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 18: Status counts sum to total
  // Validates: Requirements 6.3
  it("sum of (pendiente_pago + confirmada + cancelada) equals total registrations for the event", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a list of 0–20 registrations with distinct practitioner IDs
        fc
          .array(
            fc.record({
              practitionerId: uuidArb,
              status: statusArb,
            }),
            { minLength: 0, maxLength: 20 },
          )
          .map((items) => {
            // Deduplicate by practitionerId to respect UNIQUE constraint
            const seen = new Set<string>();
            return items.filter((item) => {
              if (seen.has(item.practitionerId)) return false;
              seen.add(item.practitionerId);
              return true;
            });
          }),
        async (items) => {
          repo.reset();
          const eventId = "event-fixed-id";

          // Save all registrations
          for (let i = 0; i < items.length; i++) {
            const item = items[i]!;
            const reg = makeRegistration({
              id: `reg-${i}`,
              eventId,
              practitionerId: item.practitionerId,
              status: item.status,
            });
            await repo.save(reg);
          }

          const counts = await repo.countByEventGroupedByStatus(eventId);
          const total =
            counts.pendiente_pago + counts.confirmada + counts.cancelada;

          return total === items.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("counts only registrations belonging to the queried event", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (countA, countB) => {
          repo.reset();
          const eventA = "event-a";
          const eventB = "event-b";

          for (let i = 0; i < countA; i++) {
            await repo.save(
              makeRegistration({
                id: `a-${i}`,
                eventId: eventA,
                practitionerId: `prac-a-${i}`,
                status: "confirmada",
              }),
            );
          }
          for (let i = 0; i < countB; i++) {
            await repo.save(
              makeRegistration({
                id: `b-${i}`,
                eventId: eventB,
                practitionerId: `prac-b-${i}`,
                status: "pendiente_pago",
              }),
            );
          }

          const countsA = await repo.countByEventGroupedByStatus(eventA);
          const totalA =
            countsA.pendiente_pago + countsA.confirmada + countsA.cancelada;

          return totalA === countA;
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("InMemoryEventRegistrationRepository — Property 13: No duplicate registrations", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 13: No duplicate registrations
  // Validates: Requirements 4.4
  it("registering an already-registered practitioner does not create a second record", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (eventId, practitionerId) => {
        repo.reset();

        const first = makeRegistration({
          id: "reg-first",
          eventId,
          practitionerId,
        });
        await repo.save(first);

        // Attempt duplicate registration
        const duplicate = makeRegistration({
          id: "reg-duplicate",
          eventId,
          practitionerId,
        });

        let threw = false;
        try {
          await repo.save(duplicate);
        } catch {
          threw = true;
        }

        // The duplicate must have been rejected
        if (!threw) return false;

        // Count registrations for this (event, practitioner) pair — must be exactly 1
        const existing = await repo.findByPractitionerAndEvent(
          practitionerId,
          eventId,
        );
        return existing !== null && existing.id === "reg-first";
      }),
      { numRuns: 100 },
    );
  });

  it("allows the same practitioner to register in different events", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        async (practitionerId, eventA, eventB) => {
          // Skip if both events happen to be the same UUID
          if (eventA === eventB) return true;

          repo.reset();

          await repo.save(
            makeRegistration({ id: "reg-a", eventId: eventA, practitionerId }),
          );

          let threw = false;
          try {
            await repo.save(
              makeRegistration({
                id: "reg-b",
                eventId: eventB,
                practitionerId,
              }),
            );
          } catch {
            threw = true;
          }

          return !threw;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("allows different practitioners to register in the same event", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        async (eventId, pracA, pracB) => {
          if (pracA === pracB) return true;

          repo.reset();

          await repo.save(
            makeRegistration({ id: "reg-a", eventId, practitionerId: pracA }),
          );

          let threw = false;
          try {
            await repo.save(
              makeRegistration({ id: "reg-b", eventId, practitionerId: pracB }),
            );
          } catch {
            threw = true;
          }

          return !threw;
        },
      ),
      { numRuns: 100 },
    );
  });
});
