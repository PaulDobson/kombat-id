import { describe, it } from "vitest";
import fc from "fast-check";
import { z } from "zod";
import { formatRegistrationFee, hasCapacity } from "./eventRegistration";

// ---------------------------------------------------------------------------
// Schema that mirrors the DB constraints for martial_events new fields
// ---------------------------------------------------------------------------

const EventDataSchema = z.object({
  description: z
    .string()
    .max(5000, "La descripción no puede superar los 5000 caracteres")
    .nullable()
    .optional(),
  registration_fee: z
    .number()
    .min(0, "El precio no puede ser negativo")
    .nullable()
    .optional(),
  min_participants: z.number().int().min(1).nullable().optional(),
  max_participants: z.number().int().min(1).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Property 1: Description round-trip
// Validates: Requirements 1.1, 1.3
// ---------------------------------------------------------------------------

describe("Event detail — Property 1: Description round-trip", () => {
  // Feature: event-registration-system, Property 1: Description round-trip
  it("any description up to 5000 chars passes schema validation unchanged", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 5000 }),
        (description) => {
          const result = EventDataSchema.safeParse({ description });
          if (!result.success) return false;
          return result.data.description === description;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("null description is preserved as null", () => {
    const result = EventDataSchema.safeParse({ description: null });
    if (!result.success) throw new Error("Expected success");
    if (result.data.description !== null) throw new Error("Expected null");
  });
});

// ---------------------------------------------------------------------------
// Property 3: Registration fee round-trip
// Validates: Requirements 2.1, 2.4
// ---------------------------------------------------------------------------

describe("Event detail — Property 3: Registration fee round-trip", () => {
  // Feature: event-registration-system, Property 3: Registration fee round-trip
  it("any non-negative fee (including null) passes schema validation unchanged", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(0),
          fc.float({ min: 0, max: Math.fround(999_999), noNaN: true }),
        ),
        (fee) => {
          const result = EventDataSchema.safeParse({ registration_fee: fee });
          if (!result.success) return false;
          if (fee === null) return result.data.registration_fee === null;
          return result.data.registration_fee === fee;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("formatRegistrationFee is consistent with the stored value", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(0),
          fc.integer({ min: 1, max: 999_999 }),
        ),
        (fee) => {
          const formatted = formatRegistrationFee(fee);
          if (fee === null || fee === 0) return formatted === "Entrada libre";
          return formatted !== "Entrada libre" && formatted.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Participant limits round-trip
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------

describe("Event detail — Property 6: Participant limits round-trip", () => {
  // Feature: event-registration-system, Property 6: Participant limits round-trip
  it("any valid (min, max) pair where max >= min and both >= 1 passes schema validation unchanged", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        (min, extra) => {
          const max = min + extra;
          const result = EventDataSchema.safeParse({
            min_participants: min,
            max_participants: max,
          });
          if (!result.success) return false;
          return (
            result.data.min_participants === min &&
            result.data.max_participants === max
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("hasCapacity correctly reflects max_participants vs confirmed count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 600 }),
        (maxParticipants, confirmedCount) => {
          const capacity = hasCapacity(maxParticipants, confirmedCount);
          if (confirmedCount >= maxParticipants) return capacity === false;
          return capacity === true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
