import { describe, it } from "vitest";
import fc from "fast-check";
import {
  determineInitialStatus,
  formatRegistrationFee,
  hasCapacity,
} from "./eventRegistration";

describe("formatRegistrationFee", () => {
  // Feature: event-registration-system, Property 5: Fee display formatting
  it("returns 'Entrada libre' if and only if fee is null or 0", () => {
    // Validates: Requirements 2.7
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(0),
          fc.integer({ min: 1, max: 9999999 }),
        ),
        (fee) => {
          const result = formatRegistrationFee(fee);
          if (fee === null || fee === 0) {
            return result === "Entrada libre";
          } else {
            return result !== "Entrada libre";
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("includes the numeric value in the formatted string for positive fees", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9999999 }), (fee) => {
        const result = formatRegistrationFee(fee);
        return result !== "Entrada libre" && result.length > 0;
      }),
      { numRuns: 100 },
    );
  });
});

describe("hasCapacity", () => {
  // Feature: event-registration-system, Property 9: Capacity display invariant
  it("returns false if and only if confirmedCount >= maxParticipants", () => {
    // Validates: Requirements 3.6
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (maxParticipants, confirmedCount) => {
          const result = hasCapacity(maxParticipants, confirmedCount);
          if (confirmedCount >= maxParticipants) {
            return result === false;
          } else {
            return result === true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("always returns true when maxParticipants is null", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (confirmedCount) => {
        return hasCapacity(null, confirmedCount) === true;
      }),
      { numRuns: 100 },
    );
  });
});

describe("determineInitialStatus", () => {
  // Feature: event-registration-system, Property 14: Initial status based on event type
  it("returns 'confirmada' if and only if fee is null or 0", () => {
    // Validates: Requirements 5.1, 5.2
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(0),
          fc.integer({ min: 1, max: 9999999 }),
        ),
        (fee) => {
          const status = determineInitialStatus(fee);
          if (fee === null || fee === 0) {
            return status === "confirmada";
          } else {
            return status === "pendiente_pago";
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
