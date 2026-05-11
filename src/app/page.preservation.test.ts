/**
 * Preservation Property Tests — public-referee-link
 *
 * **Property 2: Preservation** — Comportamiento existente sin cambios
 *
 * These tests establish the baseline behavior that MUST be preserved after the fix.
 * They inspect the static source of `src/app/page.tsx` directly, since LandingPage
 * is an async Server Component with Supabase calls that cannot be rendered in vitest.
 *
 * EXPECTED OUTCOME on unfixed code: PASS (confirms baseline behavior to preserve).
 * EXPECTED OUTCOME after fix: PASS (confirms no regressions were introduced).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Load the source file under test
// ---------------------------------------------------------------------------

const PAGE_PATH = path.resolve(__dirname, "page.tsx");
const pageSource = fs.readFileSync(PAGE_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Source extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the footer <nav> block from page.tsx.
 * The footer section starts at the `── FOOTER` comment and runs to end of file.
 */
function extractFooterNav(source: string): string {
  const start = source.indexOf("FOOTER");
  if (start === -1) return "";
  return source.slice(start);
}

/**
 * Extracts the "Árbitros Oficiales" section from page.tsx.
 * Starts at the `── ÁRBITROS OFICIALES` comment and ends before `── CTA FINAL`.
 */
function extractArbitrosSection(source: string): string {
  const start = source.indexOf("ÁRBITROS OFICIALES");
  const end = source.indexOf("CTA FINAL");
  if (start === -1 || end === -1) return "";
  return source.slice(start, end);
}

/**
 * Extracts the "Próximas actividades" / upcoming events section from page.tsx.
 * Starts at `── PRÓXIMOS EVENTOS` and ends before `── ÁRBITROS OFICIALES`.
 */
function extractUpcomingSection(source: string): string {
  const start = source.indexOf("PRÓXIMOS EVENTOS");
  const end = source.indexOf("ÁRBITROS OFICIALES");
  if (start === -1 || end === -1) return "";
  return source.slice(start, end);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates an array length between 0 and 200 (inclusive).
 * Represents the number of approved referees — preservation properties must
 * hold for any referee count.
 */
const refereeArrayLength = fc.integer({ min: 0, max: 200 });

/**
 * Generates a positive integer n (1–200) for the singular/plural counter test.
 */
const positiveRefereeCount = fc.integer({ min: 1, max: 200 });

// ---------------------------------------------------------------------------
// Property 2a: Footer links preservation
// Validates: Requirements 3.3
//
// For any array of referees of arbitrary length (0–200), the footer <nav>
// MUST contain exactly the 4 pre-existing links with their original hrefs,
// texts, and classes — unchanged.
// ---------------------------------------------------------------------------

describe("LandingPage — Property 2a: Preservation — Footer links preexistentes", () => {
  const footerNav = extractFooterNav(pageSource);

  /**
   * **Validates: Requirements 3.3**
   *
   * The footer <nav> must contain href="/academies" with text "Academias"
   * and class "hover:text-neutral-400 transition-colors" for any referee count.
   */
  it(
    'el footer contiene href="/academies" con texto "Academias" y clase original ' +
      "para cualquier longitud de array de árbitros",
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          // href present
          expect(
            footerNav,
            'El footer no contiene href="/academies". El link "Academias" fue eliminado o modificado.',
          ).toContain('href="/academies"');

          // text present
          expect(
            footerNav,
            'El footer no contiene el texto "Academias". El link fue alterado.',
          ).toContain("Academias");

          // original class present
          expect(
            footerNav,
            'El footer no contiene la clase "hover:text-neutral-400 transition-colors" en el link de Academias.',
          ).toContain("hover:text-neutral-400 transition-colors");
        }),
        { numRuns: 50 },
      );
    },
  );

  /**
   * **Validates: Requirements 3.3**
   *
   * The footer <nav> must contain href="/verify" with text "Verificar"
   * for any referee count.
   */
  it('el footer contiene href="/verify" con texto "Verificar" para cualquier longitud de array de árbitros', () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          footerNav,
          'El footer no contiene href="/verify". El link "Verificar" fue eliminado o modificado.',
        ).toContain('href="/verify"');

        expect(
          footerNav,
          'El footer no contiene el texto "Verificar". El link fue alterado.',
        ).toContain("Verificar");
      }),
      { numRuns: 50 },
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * The footer <nav> must contain href="/login" with text "Iniciar sesión"
   * for any referee count.
   */
  it('el footer contiene href="/login" con texto "Iniciar sesión" para cualquier longitud de array de árbitros', () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          footerNav,
          'El footer no contiene href="/login". El link "Iniciar sesión" fue eliminado o modificado.',
        ).toContain('href="/login"');

        expect(
          footerNav,
          'El footer no contiene el texto "Iniciar sesión". El link fue alterado.',
        ).toContain("Iniciar sesión");
      }),
      { numRuns: 50 },
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * The footer <nav> must contain href="/register" with text "Registrarse"
   * for any referee count.
   */
  it('el footer contiene href="/register" con texto "Registrarse" para cualquier longitud de array de árbitros', () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          footerNav,
          'El footer no contiene href="/register". El link "Registrarse" fue eliminado o modificado.',
        ).toContain('href="/register"');

        expect(
          footerNav,
          'El footer no contiene el texto "Registrarse". El link fue alterado.',
        ).toContain("Registrarse");
      }),
      { numRuns: 50 },
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * The footer <nav> aria-label must remain "Footer" — the nav landmark
   * must not be removed or renamed.
   */
  it('el footer <nav> mantiene aria-label="Footer" para cualquier longitud de array de árbitros', () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          footerNav,
          'El footer <nav> no contiene aria-label="Footer". El nav fue alterado.',
        ).toContain('aria-label="Footer"');
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2b: Referee counter plural/singular
// Validates: Requirements 3.1
//
// For any array of referees of length n:
//   - if n === 1 → the source contains "árbitro" (singular, without trailing 's')
//   - if n !== 1 → the source contains "árbitros" (plural)
//
// Since the source is static, we verify the JSX expression that produces this
// behavior is present verbatim in the "Árbitros Oficiales" section.
// ---------------------------------------------------------------------------

describe("LandingPage — Property 2b: Preservation — Contador de árbitros singular/plural", () => {
  const arbitrosSection = extractArbitrosSection(pageSource);

  /**
   * **Validates: Requirements 3.1**
   *
   * The "Árbitros Oficiales" section must contain the ternary expression that
   * produces the correct singular/plural form for any referee count n.
   *
   * The exact JSX expression observed in the unfixed source:
   *   {approvedReferees.length === 1 ? "árbitro" : "árbitros"}
   *
   * This expression is the implementation of the counter rule:
   *   n === 1 → "árbitro", n !== 1 → "árbitros"
   */
  it(
    'la sección "Árbitros Oficiales" contiene la expresión ternaria singular/plural ' +
      'correcta para cualquier n: n===1 → "árbitro", n!==1 → "árbitros"',
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          // The ternary that implements the rule must be present verbatim
          expect(
            arbitrosSection,
            'La sección "Árbitros Oficiales" no contiene la expresión ternaria ' +
              '"árbitro" : "árbitros". El contador fue alterado.',
          ).toContain('"árbitro" : "árbitros"');
        }),
        { numRuns: 50 },
      );
    },
  );

  /**
   * **Validates: Requirements 3.1**
   *
   * The counter must reference approvedReferees.length — the actual count
   * of approved referees — for any n.
   */
  it(
    'la sección "Árbitros Oficiales" muestra approvedReferees.length como contador ' +
      "para cualquier longitud de array de árbitros",
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          expect(
            arbitrosSection,
            'La sección "Árbitros Oficiales" no contiene "approvedReferees.length". ' +
              "El contador fue eliminado o reemplazado.",
          ).toContain("approvedReferees.length");
        }),
        { numRuns: 50 },
      );
    },
  );

  /**
   * **Validates: Requirements 3.1**
   *
   * For n === 1, the counter must produce "1 árbitro" (singular).
   * We verify this by checking the ternary condition `=== 1` is present.
   */
  it("la expresión del contador usa la condición === 1 para distinguir singular de plural", () => {
    fc.assert(
      fc.property(positiveRefereeCount, (_n) => {
        expect(
          arbitrosSection,
          'La sección "Árbitros Oficiales" no contiene la condición "=== 1" ' +
            "para el singular. La lógica del contador fue alterada.",
        ).toContain("=== 1");
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2c: RefereeGrid props preservation
// Validates: Requirements 3.1
//
// The "Árbitros Oficiales" section must continue to render <RefereeGrid>
// with the same props (referees, searchQuery) for any array of referees.
// ---------------------------------------------------------------------------

describe("LandingPage — Property 2c: Preservation — RefereeGrid props", () => {
  const arbitrosSection = extractArbitrosSection(pageSource);

  /**
   * **Validates: Requirements 3.1**
   *
   * <RefereeGrid> must be present in the "Árbitros Oficiales" section
   * for any referee count.
   */
  it('la sección "Árbitros Oficiales" contiene <RefereeGrid> para cualquier longitud de array de árbitros', () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          arbitrosSection,
          'La sección "Árbitros Oficiales" no contiene <RefereeGrid>. ' +
            "El componente fue eliminado o renombrado.",
        ).toContain("RefereeGrid");
      }),
      { numRuns: 50 },
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * <RefereeGrid> must receive referees={approvedReferees} as a prop
   * for any referee count.
   */
  it("<RefereeGrid> recibe referees={approvedReferees} para cualquier longitud de array de árbitros", () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          arbitrosSection,
          "<RefereeGrid> no recibe referees={approvedReferees}. " +
            "El prop fue eliminado o modificado.",
        ).toContain("referees={approvedReferees}");
      }),
      { numRuns: 50 },
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * <RefereeGrid> must receive searchQuery conditionally — the conditional
   * spread pattern must be preserved.
   */
  it("<RefereeGrid> mantiene el prop searchQuery condicional para cualquier longitud de array de árbitros", () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          arbitrosSection,
          "<RefereeGrid> no contiene el prop searchQuery condicional. " +
            "El patrón de spread condicional fue eliminado o modificado.",
        ).toContain("searchQuery");
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2d: Upcoming events section preservation
// Validates: Requirements 3.4
//
// The "Próximas actividades" section and its "Ver todos →" link to /login
// must remain intact for any referee count.
// ---------------------------------------------------------------------------

describe('LandingPage — Property 2d: Preservation — Sección "Próximas actividades"', () => {
  const upcomingSection = extractUpcomingSection(pageSource);

  /**
   * **Validates: Requirements 3.4**
   *
   * The "Próximas actividades" section must contain the "Ver todos →" link
   * pointing to /login for any referee count.
   */
  it(
    'la sección "Próximas actividades" contiene el link "Ver todos →" hacia /login ' +
      "para cualquier longitud de array de árbitros",
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          expect(
            upcomingSection,
            'La sección "Próximas actividades" no contiene href="/login". ' +
              'El link "Ver todos →" fue eliminado o su destino fue modificado.',
          ).toContain('href="/login"');

          expect(
            upcomingSection,
            'La sección "Próximas actividades" no contiene el texto "Ver todos →". ' +
              "El link fue eliminado o su texto fue modificado.",
          ).toContain("Ver todos →");
        }),
        { numRuns: 50 },
      );
    },
  );

  /**
   * **Validates: Requirements 3.4**
   *
   * The "Próximas actividades" heading must remain present for any referee count.
   */
  it('la sección "Próximas actividades" mantiene su heading para cualquier longitud de array de árbitros', () => {
    fc.assert(
      fc.property(refereeArrayLength, (_length) => {
        expect(
          upcomingSection,
          'La sección "Próximas actividades" no contiene su heading. ' +
            "La sección fue eliminada o su título fue modificado.",
        ).toContain("Próximas actividades");
      }),
      { numRuns: 50 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * The upcoming section must remain conditionally rendered based on
   * upcoming.length > 0 — the conditional rendering guard must be preserved.
   */
  it(
    'la sección "Próximas actividades" mantiene su renderizado condicional (upcoming.length > 0) ' +
      "para cualquier longitud de array de árbitros",
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          expect(
            upcomingSection,
            'La sección "Próximas actividades" no contiene la condición "upcoming.length > 0". ' +
              "El renderizado condicional fue eliminado o modificado.",
          ).toContain("upcoming.length > 0");
        }),
        { numRuns: 50 },
      );
    },
  );
});
