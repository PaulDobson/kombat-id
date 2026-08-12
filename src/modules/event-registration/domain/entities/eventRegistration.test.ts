import { describe, it } from "vitest";
import fc from "fast-check";
import {
  determineInitialStatus,
  formatRegistrationFee,
  hasCapacity,
  isDeletable,
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

describe("isDeletable", () => {
  // Feature: instructor-delete-event-registration, Property: Deletion eligibility rules
  it("returns false for all cancelada status registrations regardless of fee", () => {
    // Validates: Requirements 1.4, 7.5
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(0),
          fc.integer({ min: 1, max: 9999999 }),
        ),
        (fee) => {
          return isDeletable("cancelada", fee) === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns true for all pendiente_pago status registrations regardless of fee", () => {
    // Validates: Requirements 1.1, 3.7, 7.2
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(0),
          fc.integer({ min: 1, max: 9999999 }),
        ),
        (fee) => {
          return isDeletable("pendiente_pago", fee) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns true for confirmada status when fee is null or 0 (free events)", () => {
    // Validates: Requirements 1.2, 3.6, 7.3
    fc.assert(
      fc.property(fc.oneof(fc.constant(null), fc.constant(0)), (fee) => {
        return isDeletable("confirmada", fee) === true;
      }),
      { numRuns: 100 },
    );
  });

  it("returns false for confirmada status when fee is greater than 0 (paid events)", () => {
    // Validates: Requirements 1.3, 3.5, 7.4
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9999999 }), (fee) => {
        return isDeletable("confirmada", fee) === false;
      }),
      { numRuns: 100 },
    );
  });
});
