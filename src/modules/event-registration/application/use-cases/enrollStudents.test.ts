import { describe, it, beforeEach } from "vitest";
import fc from "fast-check";
import { enrollStudents, EnrollStudentsInput } from "./enrollStudents";
import { EventAtCapacityError } from "../../domain/errors";
import type { EventRegistration } from "../../domain/entities/eventRegistration";
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

function makeConfirmedRegistration(
  id: string,
  eventId: string,
  practitionerId: string,
): EventRegistration {
  const now = new Date().toISOString();
  return {
    id,
    eventId,
    practitionerId,
    instructorId: "instructor-seed",
    status: "confirmada",
    registeredAt: now,
    confirmedAt: now,
    confirmedBy: "instructor-seed",
    cancelledAt: null,
    cancelledBy: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Arbitraries
const uuidArb = fc.uuid();

// Positive integer fee (paid event)
const paidFeeArb = fc.integer({ min: 1, max: 100_000 });

// ---------------------------------------------------------------------------
// Property 8: Capacity enforcement
// ---------------------------------------------------------------------------

describe("enrollStudents — Property 8: Capacity enforcement", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 8: Capacity enforcement
  // Validates: Requirements 3.5, 4.5
  it("when confirmed count equals max_participants, enrolling any additional student throws EventAtCapacityError without modifying the count", async () => {
    await fc.assert(
      fc.asyncProperty(
        // N: capacity between 1 and 20
        fc.integer({ min: 1, max: 20 }),
        // eventId and instructorId
        uuidArb,
        uuidArb,
        // extra practitioner to attempt enrollment
        uuidArb,
        // registration fee (paid or free — capacity check applies regardless)
        fc.oneof(fc.constant(null), fc.constant(0), paidFeeArb),
        async (n, eventId, instructorId, extraPractitionerId, fee) => {
          repo.reset();

          // Seed exactly N confirmed registrations
          for (let i = 0; i < n; i++) {
            await repo.save(
              makeConfirmedRegistration(`seed-${i}`, eventId, `prac-seed-${i}`),
            );
          }

          const countBefore = await repo.countConfirmedByEvent(eventId);

          const input: EnrollStudentsInput = {
            instructorId,
            eventId,
            registrationFee: fee,
            maxParticipants: n, // exactly at capacity
            practitioners: [{ id: extraPractitionerId, name: "Extra Student" }],
          };

          let threwCapacityError = false;
          try {
            await enrollStudents(input, repo);
          } catch (err) {
            if (err instanceof EventAtCapacityError) {
              threwCapacityError = true;
            } else {
              throw err;
            }
          }

          const countAfter = await repo.countConfirmedByEvent(eventId);

          return threwCapacityError && countAfter === countBefore;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("does not throw when confirmed count is strictly less than max_participants", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 19 }),
        uuidArb,
        uuidArb,
        uuidArb,
        async (n, eventId, instructorId, newPractitionerId) => {
          repo.reset();

          // Seed n-1 confirmed registrations (one slot remaining)
          for (let i = 0; i < n - 1; i++) {
            await repo.save(
              makeConfirmedRegistration(`seed-${i}`, eventId, `prac-seed-${i}`),
            );
          }

          const input: EnrollStudentsInput = {
            instructorId,
            eventId,
            registrationFee: null, // free event → auto-confirmed
            maxParticipants: n,
            practitioners: [{ id: newPractitionerId, name: "New Student" }],
          };

          let threw = false;
          try {
            await enrollStudents(input, repo);
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

// ---------------------------------------------------------------------------
// Property 12: Registration creation round-trip
// ---------------------------------------------------------------------------

describe("enrollStudents — Property 12: Registration creation round-trip", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 12: Registration creation round-trip
  // Validates: Requirements 4.3, 5.5
  it("after enrolling a student, querying by (event_id, practitioner_id) returns a record with all required fields", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        fc.oneof(fc.constant(null), fc.constant(0), paidFeeArb),
        async (eventId, practitionerId, instructorId, fee) => {
          repo.reset();

          const input: EnrollStudentsInput = {
            instructorId,
            eventId,
            registrationFee: fee,
            maxParticipants: null, // no capacity limit
            practitioners: [{ id: practitionerId, name: "Test Student" }],
          };

          await enrollStudents(input, repo);

          const record = await repo.findByPractitionerAndEvent(
            practitionerId,
            eventId,
          );

          if (record === null) return false;

          // All required fields must be present (non-undefined)
          const hasStatus = record.status !== undefined;
          const hasRegisteredAt =
            typeof record.registeredAt === "string" &&
            record.registeredAt.length > 0;

          // confirmed_at and confirmed_by depend on fee:
          // free event → status = 'confirmada', confirmedAt non-null
          // paid event → status = 'pendiente_pago', confirmedAt null
          const isFree = fee === null || fee === 0;

          const statusCorrect = isFree
            ? record.status === "confirmada"
            : record.status === "pendiente_pago";

          const confirmedAtCorrect = isFree
            ? typeof record.confirmedAt === "string" &&
              record.confirmedAt.length > 0
            : record.confirmedAt === null;

          const confirmedByCorrect = isFree
            ? record.confirmedBy === instructorId
            : record.confirmedBy === null;

          return (
            hasStatus &&
            hasRegisteredAt &&
            statusCorrect &&
            confirmedAtCorrect &&
            confirmedByCorrect
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("enrolled student record contains the correct eventId and practitionerId", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        async (eventId, practitionerId, instructorId) => {
          repo.reset();

          const input: EnrollStudentsInput = {
            instructorId,
            eventId,
            registrationFee: null,
            maxParticipants: null,
            practitioners: [{ id: practitionerId, name: "Student" }],
          };

          await enrollStudents(input, repo);

          const record = await repo.findByPractitionerAndEvent(
            practitionerId,
            eventId,
          );

          return (
            record !== null &&
            record.eventId === eventId &&
            record.practitionerId === practitionerId &&
            record.instructorId === instructorId
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
