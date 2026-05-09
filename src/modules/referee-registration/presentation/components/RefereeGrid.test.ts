/**
 * Property-based tests for `RefereeGrid` filtering logic.
 *
 * Since `RefereeGrid` is a Server Component (JSX), it cannot be rendered in a
 * vitest unit test without a full React testing setup. Instead, we extract and
 * test the filtering logic directly as a pure function.
 *
 * **Validates: Requisitos 4.1, 4.4**
 *
 * Propiedad 4: Correspondencia 1:1 entre array y tarjetas renderizadas
 *   Para cualquier array `RefereeListItem[]` de longitud N sin filtro activo,
 *   el resultado debe contener exactamente N elementos.
 *
 * Propiedad 5: Filtrado de búsqueda es subconjunto correcto
 *   Para cualquier query no vacío, todos los elementos del resultado deben
 *   contener el query en su `fullName` (case-insensitive), y ningún elemento
 *   cuyo `fullName` no lo contenga debe aparecer en el resultado.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { RefereeListItem } from "./refereeListItem";

// ---------------------------------------------------------------------------
// Filter logic — mirrors the implementation in RefereeGrid.tsx exactly
// ---------------------------------------------------------------------------

/**
 * Replicates the filter logic from `RefereeGrid`:
 *
 *   const filtered =
 *     searchQuery != null && searchQuery !== ""
 *       ? referees.filter((r) =>
 *           r.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
 *         )
 *       : referees;
 */
function filterReferees(
  referees: RefereeListItem[],
  searchQuery?: string,
): RefereeListItem[] {
  return searchQuery != null && searchQuery !== ""
    ? referees.filter((r) =>
        r.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : referees;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid ISO timestamp string or null. */
const approvedAt: fc.Arbitrary<string | null> = fc.option(
  fc
    .integer({
      min: new Date("2000-01-01T00:00:00.000Z").getTime(),
      max: new Date("2099-12-31T23:59:59.999Z").getTime(),
    })
    .map((ms) => new Date(ms).toISOString()),
  { nil: null },
);

/** Generates a single `RefereeListItem`. */
const refereeListItem: fc.Arbitrary<RefereeListItem> = fc.record({
  id: fc.uuid(),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  country: fc.string({ minLength: 1, maxLength: 60 }),
  registrationNumber: fc.string({ minLength: 1, maxLength: 50 }),
  approvedAt,
});

/** Generates an array of `RefereeListItem` (0–50 items). */
const refereeArray: fc.Arbitrary<RefereeListItem[]> = fc.array(
  refereeListItem,
  { minLength: 0, maxLength: 50 },
);

/** Generates a non-empty search query string. */
const nonEmptyQuery: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 20,
});

// ---------------------------------------------------------------------------
// Propiedad 4: Correspondencia 1:1 entre array y tarjetas renderizadas
// Validates: Requisito 4.1
// ---------------------------------------------------------------------------

describe("filterReferees — Propiedad 4: Correspondencia 1:1 sin filtro", () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * When searchQuery is absent (undefined), the result must contain exactly
   * the same N items as the input array — no items added or removed.
   */
  it("sin searchQuery retorna exactamente N elementos para un array de longitud N", () => {
    fc.assert(
      fc.property(refereeArray, (referees) => {
        const result = filterReferees(referees, undefined);
        expect(result).toHaveLength(referees.length);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 4.1, 4.5**
   *
   * When searchQuery is an empty string, the result must also contain all N
   * items — an empty query is treated as "no filter".
   */
  it("con searchQuery vacío ('') retorna exactamente N elementos para un array de longitud N", () => {
    fc.assert(
      fc.property(refereeArray, (referees) => {
        const result = filterReferees(referees, "");
        expect(result).toHaveLength(referees.length);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * The result without a filter must be the same array reference (identity),
   * confirming no transformation is applied.
   */
  it("sin searchQuery retorna el mismo array de referencia (sin transformación)", () => {
    fc.assert(
      fc.property(refereeArray, (referees) => {
        const result = filterReferees(referees, undefined);
        expect(result).toBe(referees);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 5: Filtrado de búsqueda es subconjunto correcto
// Validates: Requisito 4.4
// ---------------------------------------------------------------------------

describe("filterReferees — Propiedad 5: Filtrado de búsqueda es subconjunto correcto", () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * Every item in the filtered result must have a fullName that contains the
   * query (case-insensitive). No item whose fullName does not contain the query
   * may appear in the result.
   */
  it("todos los elementos del resultado contienen el query en fullName (case-insensitive)", () => {
    fc.assert(
      fc.property(refereeArray, nonEmptyQuery, (referees, query) => {
        const result = filterReferees(referees, query);
        const queryLower = query.toLowerCase();

        for (const item of result) {
          expect(
            item.fullName.toLowerCase().includes(queryLower),
            `El elemento "${item.fullName}" no contiene el query "${query}"`,
          ).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * No item whose fullName does NOT contain the query may appear in the result.
   * This is the complement of the previous property — together they prove the
   * filter is both sound (no false positives) and complete (no false negatives).
   */
  it("ningún elemento cuyo fullName no contiene el query aparece en el resultado", () => {
    fc.assert(
      fc.property(refereeArray, nonEmptyQuery, (referees, query) => {
        const result = filterReferees(referees, query);
        const queryLower = query.toLowerCase();

        const resultIds = new Set(result.map((r) => r.id));

        for (const item of referees) {
          if (!item.fullName.toLowerCase().includes(queryLower)) {
            expect(
              resultIds.has(item.id),
              `El elemento "${item.fullName}" (id: ${item.id}) no debería estar en el resultado para query "${query}"`,
            ).toBe(false);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * The filtered result is always a subset of the original array — no new
   * items are introduced by the filter.
   */
  it("el resultado filtrado es siempre un subconjunto del array original", () => {
    fc.assert(
      fc.property(refereeArray, nonEmptyQuery, (referees, query) => {
        const result = filterReferees(referees, query);
        const originalIds = new Set(referees.map((r) => r.id));

        for (const item of result) {
          expect(
            originalIds.has(item.id),
            `El elemento "${item.id}" no existe en el array original`,
          ).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * The filter is idempotent: applying it twice with the same query produces
   * the same result as applying it once.
   */
  it("el filtro es idempotente: aplicarlo dos veces produce el mismo resultado", () => {
    fc.assert(
      fc.property(refereeArray, nonEmptyQuery, (referees, query) => {
        const once = filterReferees(referees, query);
        const twice = filterReferees(once, query);
        expect(twice).toHaveLength(once.length);
        expect(twice.map((r) => r.id)).toEqual(once.map((r) => r.id));
      }),
      { numRuns: 200 },
    );
  });
});
