/**
 * Property tests for date formatting in RefereeCard.
 *
 * Validates: Requisitos 5.4, 5.5, 6.1, 6.2
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatDateLong } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPANISH_MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Pattern: "D de [mes] de YYYY"
 * - D: one or two digits, no leading zero
 * - [mes]: one of the 12 Spanish month names
 * - YYYY: four-digit year
 */
const DATE_LONG_PATTERN = new RegExp(
  `^\\d{1,2} de (${SPANISH_MONTHS.join("|")}) de \\d{4}$`,
);

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a valid ISO 8601 date string with a YYYY-MM-DD prefix.
 * Uses integer milliseconds within a safe range to avoid invalid Date values
 * during fast-check shrinking (fc.date() can produce invalid Dates on shrink).
 */
const validIsoTimestamp = fc
  .integer({
    min: new Date("1970-01-01T00:00:00.000Z").getTime(),
    max: new Date("2099-12-31T23:59:59.999Z").getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

// ---------------------------------------------------------------------------
// Propiedad 6: Formato de fecha de afiliación
// Validates: Requisitos 6.1
// ---------------------------------------------------------------------------

describe("formatDateLong — Propiedad 6: Formato de fecha de afiliación", () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For any valid ISO timestamp, formatDateLong must return a non-empty string
   * matching the pattern "D de [mes] de YYYY" where [mes] is one of the 12
   * Spanish month names.
   */
  it("retorna un string no vacío con el patrón 'D de [mes] de YYYY' para cualquier ISO timestamp válido", () => {
    fc.assert(
      fc.property(validIsoTimestamp, (iso) => {
        const result = formatDateLong(iso);

        // Must be a non-empty string
        if (typeof result !== "string" || result.length === 0) return false;

        // Must match the expected pattern
        return DATE_LONG_PATTERN.test(result);
      }),
      { numRuns: 200 },
    );
  });

  it("el mes en el resultado es siempre uno de los 12 meses en español", () => {
    fc.assert(
      fc.property(validIsoTimestamp, (iso) => {
        const result = formatDateLong(iso);
        const parts = result.split(" de ");
        // parts[1] is the month name
        return SPANISH_MONTHS.includes(parts[1] ?? "");
      }),
      { numRuns: 200 },
    );
  });

  it("el día en el resultado coincide con el día del ISO timestamp de entrada", () => {
    fc.assert(
      fc.property(validIsoTimestamp, (iso) => {
        const expectedDay = Number(iso.slice(8, 10));
        const result = formatDateLong(iso);
        const actualDay = Number(result.split(" de ")[0]);
        return actualDay === expectedDay;
      }),
      { numRuns: 200 },
    );
  });

  it("el año en el resultado coincide con el año del ISO timestamp de entrada", () => {
    fc.assert(
      fc.property(validIsoTimestamp, (iso) => {
        const expectedYear = iso.slice(0, 4);
        const result = formatDateLong(iso);
        const parts = result.split(" de ");
        const actualYear = parts[2];
        return actualYear === expectedYear;
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Guard en RefereeCard: null / undefined / "" → "—"
// Validates: Requisitos 5.5, 6.2
// ---------------------------------------------------------------------------

/**
 * Replicates the guard logic from RefereeCard.tsx:
 *
 *   const affiliationText =
 *     referee.approvedAt != null && referee.approvedAt !== ""
 *       ? `Afiliado el ${formatDateLong(referee.approvedAt)}`
 *       : "Afiliado el —";
 *
 * We test the guard in isolation so the test remains a pure unit test
 * without rendering the Server Component.
 */
function computeAffiliationText(approvedAt: string | null | undefined): string {
  return approvedAt != null && approvedAt !== ""
    ? `Afiliado el ${formatDateLong(approvedAt)}`
    : "Afiliado el —";
}

describe("RefereeCard guard — approvedAt null/undefined/empty string", () => {
  /**
   * **Validates: Requirements 5.5, 6.2**
   *
   * When approvedAt is null, undefined, or "", the guard must return
   * "Afiliado el —" without throwing an exception.
   */
  it("retorna 'Afiliado el —' cuando approvedAt es null", () => {
    expect(computeAffiliationText(null)).toBe("Afiliado el —");
  });

  it("retorna 'Afiliado el —' cuando approvedAt es undefined", () => {
    expect(computeAffiliationText(undefined)).toBe("Afiliado el —");
  });

  it("retorna 'Afiliado el —' cuando approvedAt es una cadena vacía", () => {
    expect(computeAffiliationText("")).toBe("Afiliado el —");
  });

  it("no lanza excepción para ninguno de los valores nulos/vacíos", () => {
    expect(() => computeAffiliationText(null)).not.toThrow();
    expect(() => computeAffiliationText(undefined)).not.toThrow();
    expect(() => computeAffiliationText("")).not.toThrow();
  });

  /**
   * **Validates: Requirements 5.4, 6.1**
   *
   * When approvedAt is a valid ISO timestamp, the guard must return
   * "Afiliado el D de [mes] de YYYY" — a non-empty, correctly formatted string.
   */
  it("retorna 'Afiliado el D de [mes] de YYYY' para cualquier ISO timestamp válido", () => {
    fc.assert(
      fc.property(validIsoTimestamp, (iso) => {
        const result = computeAffiliationText(iso);
        if (!result.startsWith("Afiliado el ")) return false;
        const datePart = result.slice("Afiliado el ".length);
        return DATE_LONG_PATTERN.test(datePart);
      }),
      { numRuns: 200 },
    );
  });
});
