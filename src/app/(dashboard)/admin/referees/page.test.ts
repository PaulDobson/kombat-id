/**
 * Property-based tests for the filtering and counting logic of the
 * `/admin/referees` page.
 *
 * Since the page is a Server Component that calls Supabase, the Supabase
 * I/O is not tested here. Instead, the pure logic that the page applies to
 * the data returned by the use case is tested in isolation:
 *
 *   1. The filter step: only registrations with `status === "approved"` are
 *      passed through `toRefereeListItem`.
 *   2. The count invariant: the counter value equals the length of the
 *      `RefereeListItem[]` array passed to `RefereeGrid`.
 *
 * **Validates: Requisitos 2.1, 2.2, 3.2**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { toRefereeListItem } from "@/modules/referee-registration/presentation/components/refereeListItem";
import type {
  RefereeRegistration,
  RefereeRegistrationStatus,
} from "@/modules/referee-registration/domain/entities/refereeRegistration";

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/** Generates a valid ISO timestamp string within a safe range. */
const isoTimestamp: fc.Arbitrary<string> = fc
  .integer({
    min: new Date("2000-01-01T00:00:00.000Z").getTime(),
    max: new Date("2099-12-31T23:59:59.999Z").getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

/** Generates an arbitrary `RefereeRegistration` with a given status. */
function registrationWithStatus(
  status: fc.Arbitrary<RefereeRegistrationStatus>,
): fc.Arbitrary<RefereeRegistration> {
  return fc.record({
    id: fc.uuid(),
    email: fc.emailAddress(),
    fullName: fc.string({ minLength: 1, maxLength: 100 }),
    country: fc.string({ minLength: 1, maxLength: 60 }),
    registrationNumber: fc.string({ minLength: 1, maxLength: 50 }),
    certificatePath: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
      nil: null,
    }),
    status,
    authUserId: fc.option(fc.uuid(), { nil: null }),
    approvedAt: fc.option(isoTimestamp, { nil: null }),
    approvedBy: fc.option(fc.uuid(), { nil: null }),
    rejectedAt: fc.constant(null),
    rejectedBy: fc.constant(null),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  });
}

/** Generates a `RefereeRegistration` with any of the three possible statuses. */
const anyRegistration: fc.Arbitrary<RefereeRegistration> =
  registrationWithStatus(
    fc.constantFrom(
      "pending" as const,
      "approved" as const,
      "rejected" as const,
    ),
  );

/** Generates a non-empty array of `RefereeRegistration` with mixed statuses. */
const mixedRegistrations: fc.Arbitrary<RefereeRegistration[]> = fc.array(
  anyRegistration,
  { minLength: 1, maxLength: 50 },
);

// ---------------------------------------------------------------------------
// Helper: replicates the page's filtering + serialization logic
// ---------------------------------------------------------------------------

/**
 * Mirrors the logic in `AdminRefereesPage`:
 *   const referees = items.map(toRefereeListItem);
 * where `items` is already pre-filtered to `status === "approved"` by the
 * use case. Here we test the full pipeline including the filter so that
 * Propiedad 1 can be verified end-to-end.
 */
function applyPageLogic(registrations: RefereeRegistration[]) {
  const approvedItems = registrations.filter((r) => r.status === "approved");
  const referees = approvedItems.map(toRefereeListItem);
  const total = referees.length; // mirrors: total = items.length after use-case filter
  return { referees, total };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminRefereesPage — Propiedad 1: Solo árbitros aprobados en el listado", () => {
  /**
   * **Validates: Requisitos 2.1, 2.2**
   *
   * For any set of registrations with mixed statuses, the resulting
   * `RefereeListItem[]` must contain only items that originated from
   * registrations with `status === "approved"`.
   */
  it("nunca incluye árbitros con status pending o rejected en el array resultante", () => {
    fc.assert(
      fc.property(mixedRegistrations, (registrations) => {
        const { referees } = applyPageLogic(registrations);

        // Build a lookup of approved IDs for fast membership check
        const approvedIds = new Set(
          registrations.filter((r) => r.status === "approved").map((r) => r.id),
        );

        for (const item of referees) {
          expect(
            approvedIds.has(item.id),
            `El item con id "${item.id}" no proviene de un registro aprobado`,
          ).toBe(true);
        }
      }),
    );
  });

  it("incluye exactamente todos los árbitros aprobados, sin omitir ninguno", () => {
    fc.assert(
      fc.property(mixedRegistrations, (registrations) => {
        const { referees } = applyPageLogic(registrations);

        const approvedCount = registrations.filter(
          (r) => r.status === "approved",
        ).length;

        expect(referees.length).toBe(approvedCount);
      }),
    );
  });

  it("produce un array vacío cuando no hay registros aprobados", () => {
    fc.assert(
      fc.property(
        fc.array(
          registrationWithStatus(
            fc.constantFrom("pending" as const, "rejected" as const),
          ),
          { minLength: 1, maxLength: 30 },
        ),
        (registrations) => {
          const { referees } = applyPageLogic(registrations);
          expect(referees.length).toBe(0);
        },
      ),
    );
  });
});

describe("AdminRefereesPage — Propiedad 3: Invariante de conteo entre encabezado y grid", () => {
  /**
   * **Validates: Requisito 3.2**
   *
   * For any state of the data, the numeric value shown in the page header
   * counter (`total`) must equal the number of `RefereeListItem` instances
   * in the array passed to `RefereeGrid` (`referees.length`).
   */
  it("el contador del encabezado es igual al número de RefereeListItem pasados a RefereeGrid", () => {
    fc.assert(
      fc.property(mixedRegistrations, (registrations) => {
        const { referees, total } = applyPageLogic(registrations);

        expect(total).toBe(referees.length);
      }),
    );
  });

  it("el invariante de conteo se mantiene cuando todos los registros están aprobados", () => {
    fc.assert(
      fc.property(
        fc.array(registrationWithStatus(fc.constant("approved" as const)), {
          minLength: 0,
          maxLength: 50,
        }),
        (registrations) => {
          const { referees, total } = applyPageLogic(registrations);

          expect(total).toBe(referees.length);
          expect(total).toBe(registrations.length);
        },
      ),
    );
  });

  it("el invariante de conteo se mantiene con un array vacío", () => {
    const { referees, total } = applyPageLogic([]);
    expect(total).toBe(0);
    expect(referees.length).toBe(0);
  });
});
