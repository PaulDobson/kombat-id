import { describe, it, beforeEach } from "vitest";
import fc from "fast-check";
import { confirmPayment, ConfirmPaymentInput } from "./confirmPayment";
import {
  RegistrationAlreadyConfirmedError,
  RegistrationNotFoundError,
} from "../../domain/errors";
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

function makePendingRegistration(
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
    status: "pendiente_pago",
    registeredAt: now,
    confirmedAt: null,
    confirmedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

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
    confirmedBy: "admin-seed",
    cancelledAt: null,
    cancelledBy: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Arbitraries
const uuidArb = fc.uuid();

// ---------------------------------------------------------------------------
// Property 15: Payment confirmation transition
// ---------------------------------------------------------------------------

describe("confirmPayment — Property 15: Payment confirmation transition", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 15: Payment confirmation transition
  // Validates: Requirements 5.3
  it("after confirming payment of a 'pendiente_pago' registration, status is 'confirmada' and confirmed_at is non-null", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (registrationId, eventId, practitionerId, adminId) => {
          repo.reset();

          const registration = makePendingRegistration(
            registrationId,
            eventId,
            practitionerId,
          );
          await repo.save(registration);

          const input: ConfirmPaymentInput = {
            adminId,
            registrationId,
          };

          await confirmPayment(input, repo);

          const updated = await repo.findById(registrationId);

          if (updated === null) return false;

          return (
            updated.status === "confirmada" &&
            updated.confirmedAt !== null &&
            typeof updated.confirmedAt === "string" &&
            updated.confirmedAt.length > 0 &&
            updated.confirmedBy === adminId
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Double-confirm guard
// ---------------------------------------------------------------------------

describe("confirmPayment — Property 16: Double-confirm guard", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 16: Double-confirm guard
  // Validates: Requirements 5.4
  it("confirming an already 'confirmada' registration throws RegistrationAlreadyConfirmedError and does not modify the status", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (registrationId, eventId, practitionerId, adminId) => {
          repo.reset();

          const registration = makeConfirmedRegistration(
            registrationId,
            eventId,
            practitionerId,
          );
          await repo.save(registration);

          const statusBefore = (await repo.findById(registrationId))!.status;

          const input: ConfirmPaymentInput = {
            adminId,
            registrationId,
          };

          let threwCorrectError = false;
          try {
            await confirmPayment(input, repo);
          } catch (err) {
            if (err instanceof RegistrationAlreadyConfirmedError) {
              threwCorrectError = true;
            } else {
              throw err;
            }
          }

          const statusAfter = (await repo.findById(registrationId))!.status;

          return threwCorrectError && statusAfter === statusBefore;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19: Error atomicity on confirmation failure
// ---------------------------------------------------------------------------

describe("confirmPayment — Property 19: Error atomicity on confirmation failure", () => {
  let repo: InMemoryEventRegistrationRepository;

  beforeEach(() => {
    repo = new InMemoryEventRegistrationRepository();
  });

  // Feature: event-registration-system, Property 19: Error atomicity on confirmation failure
  // Validates: Requirements 6.5
  it("if confirmPayment throws an error, the registration status in the repository remains unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        // status that will cause an error: 'confirmada' triggers RegistrationAlreadyConfirmedError
        fc.constantFrom("confirmada" as const, "cancelada" as const),
        async (
          registrationId,
          eventId,
          practitionerId,
          adminId,
          errorStatus,
        ) => {
          repo.reset();

          const now = new Date().toISOString();
          const registration: EventRegistration = {
            id: registrationId,
            eventId,
            practitionerId,
            instructorId: "instructor-seed",
            status: errorStatus,
            registeredAt: now,
            confirmedAt: errorStatus === "confirmada" ? now : null,
            confirmedBy: errorStatus === "confirmada" ? "admin-seed" : null,
            cancelledAt: errorStatus === "cancelada" ? now : null,
            cancelledBy: errorStatus === "cancelada" ? "admin-seed" : null,
            notes: null,
            createdAt: now,
            updatedAt: now,
          };
          await repo.save(registration);

          const statusBefore = (await repo.findById(registrationId))!.status;

          const input: ConfirmPaymentInput = {
            adminId,
            registrationId,
          };

          let threw = false;
          try {
            await confirmPayment(input, repo);
          } catch {
            threw = true;
          }

          const statusAfter = (await repo.findById(registrationId))!.status;

          // The call must have thrown (since status is not 'pendiente_pago')
          // and the status must remain unchanged
          return threw && statusAfter === statusBefore;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("if confirmPayment throws RegistrationNotFoundError (no record), no record is created or modified", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (nonExistentId, adminId) => {
        repo.reset();

        const input: ConfirmPaymentInput = {
          adminId,
          registrationId: nonExistentId,
        };

        let threwNotFound = false;
        try {
          await confirmPayment(input, repo);
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
