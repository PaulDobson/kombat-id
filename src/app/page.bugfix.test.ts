/**
 * Bug Condition Exploration Test — public-referee-link
 *
 * **Property 1: Bug Condition** — Navegación hacia /referees ausente en landing page
 *
 * CRITICAL: This test MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * The bug is deterministic: `src/app/page.tsx` is missing two `<Link href="/referees">`
 * elements:
 *   (a) A "Ver todos →" link in the "Árbitros Oficiales" section
 *   (b) An "Árbitros" link in the footer <nav>
 *
 * Strategy: Since LandingPage is a Server Component with async Supabase calls that
 * cannot be rendered in a vitest/node environment, we inspect the static source of
 * `src/app/page.tsx` directly. The property is scoped to the two concrete failing
 * cases and is run with arrays of arbitrary length (0–200) to confirm the bug is
 * independent of referee count.
 *
 * **Validates: Requirements 1.1, 1.2**
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
// isBugCondition — mirrors the formal specification in design.md
//
// Returns true when the bug is present:
//   NOT contains <Link href="/referees"> in "Árbitros Oficiales" section
//   OR
//   NOT contains <Link href="/referees"> in footer <nav>
// ---------------------------------------------------------------------------

/**
 * Extracts the JSX block for the "Árbitros Oficiales" section from page.tsx.
 * The section starts at the comment `── ÁRBITROS OFICIALES` and ends before
 * the next section comment `── CTA FINAL`.
 */
function extractArbitrosSection(source: string): string {
  const start = source.indexOf("ÁRBITROS OFICIALES");
  const end = source.indexOf("CTA FINAL");
  if (start === -1 || end === -1) return "";
  return source.slice(start, end);
}

/**
 * Extracts the footer <nav> block from page.tsx.
 * The footer starts at `── FOOTER` and runs to the end of the file.
 */
function extractFooterNav(source: string): string {
  const start = source.indexOf("FOOTER");
  if (start === -1) return "";
  return source.slice(start);
}

function isBugCondition(source: string): boolean {
  const arbitrosSection = extractArbitrosSection(source);
  const footerNav = extractFooterNav(source);

  const hasRefereeeLinkInArbitros =
    arbitrosSection.includes('href="/referees"');
  const hasRefereeLinkInFooter = footerNav.includes('href="/referees"');

  return !hasRefereeeLinkInArbitros || !hasRefereeLinkInFooter;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates an array length between 0 and 200 (inclusive).
 * This represents the number of approved referees passed to LandingPage.
 * The bug is independent of this value — it exists for any referee count.
 */
const refereeArrayLength = fc.integer({ min: 0, max: 200 });

// ---------------------------------------------------------------------------
// Property 1: Bug Condition — Navegación hacia /referees ausente en landing page
// Validates: Requirements 1.1, 1.2
// ---------------------------------------------------------------------------

describe("LandingPage — Property 1: Bug Condition — Navegación hacia /referees ausente", () => {
  /**
   * **Validates: Requirements 1.1, 1.2**
   *
   * For any array of referees of arbitrary length (including 0), the source of
   * `src/app/page.tsx` MUST contain:
   *   (a) `href="/referees"` in the "Árbitros Oficiales" section (for "Ver todos →")
   *   (b) `href="/referees"` in the footer <nav> (for "Árbitros")
   *
   * EXPECTED OUTCOME on unfixed code: FAILS — proving the bug exists.
   * EXPECTED OUTCOME after fix: PASSES — confirming the fix is correct.
   */
  it(
    'la sección "Árbitros Oficiales" contiene href="/referees" (link "Ver todos →") ' +
      "para cualquier longitud de array de árbitros",
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          // The source is static — the bug is independent of referee count.
          // We use _length to make this a genuine property over the input space.
          const arbitrosSection = extractArbitrosSection(pageSource);

          expect(
            arbitrosSection,
            'La sección "Árbitros Oficiales" en src/app/page.tsx no contiene href="/referees". ' +
              'Falta el link "Ver todos →" que apunte a /referees.',
          ).toContain('href="/referees"');
        }),
        { numRuns: 50 },
      );
    },
  );

  it(
    'el footer <nav> contiene href="/referees" (link "Árbitros") ' +
      "para cualquier longitud de array de árbitros",
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          const footerNav = extractFooterNav(pageSource);

          expect(
            footerNav,
            'El footer <nav> en src/app/page.tsx no contiene href="/referees". ' +
              'Falta el link "Árbitros" en el footer.',
          ).toContain('href="/referees"');
        }),
        { numRuns: 50 },
      );
    },
  );

  it(
    "isBugCondition confirma que el bug está presente en el código sin corregir " +
      "(exactamente 2 href=/referees ausentes)",
    () => {
      fc.assert(
        fc.property(refereeArrayLength, (_length) => {
          // isBugCondition returns true when the bug is present.
          // On unfixed code this should be true — the test asserts it is false
          // (i.e., the bug is NOT present), which will FAIL on unfixed code.
          const bugIsPresent = isBugCondition(pageSource);

          expect(
            bugIsPresent,
            "isBugCondition devolvió true — el bug está presente: " +
              'src/app/page.tsx no contiene href="/referees" en la sección árbitros ' +
              "y/o en el footer nav.",
          ).toBe(false);
        }),
        { numRuns: 10 },
      );
    },
  );
});
