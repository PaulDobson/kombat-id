import { describe, it } from "vitest";
import fc from "fast-check";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Replicate the schema under test (mirrors EventForm.tsx + eventActions.ts)
// ---------------------------------------------------------------------------

const EventFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    event_type: z.enum(["competition", "seminar", "exam"]),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    location: z.string().optional(),
    description: z
      .string()
      .max(5000, "La descripción no puede superar los 5000 caracteres")
      .optional(),
    isFree: z.boolean(),
    registration_fee: z
      .number({ invalid_type_error: "El precio debe ser un número válido" })
      .min(0, "El precio no puede ser negativo")
      .nullable()
      .optional(),
    min_participants: z
      .number({ invalid_type_error: "El valor debe ser mayor que cero" })
      .int()
      .min(1, "El valor debe ser mayor que cero")
      .nullable()
      .optional(),
    max_participants: z
      .number({ invalid_type_error: "El valor debe ser mayor que cero" })
      .int()
      .min(1, "El valor debe ser mayor que cero")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.min_participants != null && data.max_participants != null) {
        return data.max_participants >= data.min_participants;
      }
      return true;
    },
    {
      message: "El máximo de participantes debe ser mayor o igual al mínimo",
      path: ["max_participants"],
    },
  );

// ---------------------------------------------------------------------------
// Base valid payload
// ---------------------------------------------------------------------------

const validBase = {
  name: "Evento Test",
  event_type: "competition" as const,
  event_date: "2026-06-01",
  isFree: false,
};

// ---------------------------------------------------------------------------
// Property 2: Description length validation
// Validates: Requirements 1.6
// ---------------------------------------------------------------------------

describe("EventFormSchema — Property 2: Description length validation", () => {
  // Feature: event-registration-system, Property 2: Description length validation
  it("rejects any description longer than 5000 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5001, maxLength: 6000 }),
        (longDescription) => {
          const result = EventFormSchema.safeParse({
            ...validBase,
            description: longDescription,
          });
          return result.success === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("accepts any description of 5000 characters or fewer", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 5000 }),
        (description) => {
          const result = EventFormSchema.safeParse({
            ...validBase,
            description,
          });
          return result.success === true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Fee validation rejects invalid values
// Validates: Requirements 2.5, 2.6
// ---------------------------------------------------------------------------

describe("EventFormSchema — Property 4: Fee validation rejects invalid values", () => {
  // Feature: event-registration-system, Property 4: Fee validation rejects invalid values
  it("rejects any negative number as registration_fee", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(-1_000_000),
          max: Math.fround(-0.01),
          noNaN: true,
        }),
        (negativeFee) => {
          const result = EventFormSchema.safeParse({
            ...validBase,
            registration_fee: negativeFee,
          });
          return result.success === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects non-numeric strings as registration_fee", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => isNaN(Number(s))),
        (nonNumeric) => {
          const result = EventFormSchema.safeParse({
            ...validBase,
            registration_fee: nonNumeric,
          });
          return result.success === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("accepts zero and positive numbers as registration_fee", () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1_000_000, noNaN: true }), (fee) => {
        const result = EventFormSchema.safeParse({
          ...validBase,
          registration_fee: fee,
        });
        return result.success === true;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Participant limits validation
// Validates: Requirements 3.3, 3.4
// ---------------------------------------------------------------------------

describe("EventFormSchema — Property 7: Participant limits validation", () => {
  // Feature: event-registration-system, Property 7: Participant limits validation
  it("rejects any pair where max_participants < min_participants", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1000 }),
        fc.integer({ min: 1, max: 999 }),
        (min, offset) => {
          const max = min - offset; // max is always < min
          if (max < 1) return true; // skip — would fail for a different reason
          const result = EventFormSchema.safeParse({
            ...validBase,
            min_participants: min,
            max_participants: max,
          });
          return result.success === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects min_participants < 1", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 0 }), (invalidMin) => {
        const result = EventFormSchema.safeParse({
          ...validBase,
          min_participants: invalidMin,
        });
        return result.success === false;
      }),
      { numRuns: 100 },
    );
  });

  it("rejects max_participants < 1", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 0 }), (invalidMax) => {
        const result = EventFormSchema.safeParse({
          ...validBase,
          max_participants: invalidMax,
        });
        return result.success === false;
      }),
      { numRuns: 100 },
    );
  });

  it("accepts valid pairs where max >= min and both >= 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        (min, extra) => {
          const max = min + extra; // max >= min always
          const result = EventFormSchema.safeParse({
            ...validBase,
            min_participants: min,
            max_participants: max,
          });
          return result.success === true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
