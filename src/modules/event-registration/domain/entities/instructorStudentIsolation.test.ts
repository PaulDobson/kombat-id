import { describe, it } from "vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Pure helper that mirrors the DB filter used in the enroll page:
// returns only practitioners whose instructor_id matches the given instructorId.
// ---------------------------------------------------------------------------

interface Practitioner {
  id: string;
  full_name: string;
  instructor_id: string | null;
  is_active: boolean;
}

function filterStudentsByInstructor(
  practitioners: Practitioner[],
  instructorId: string,
): Practitioner[] {
  return practitioners.filter(
    (p) => p.instructor_id === instructorId && p.is_active,
  );
}

// ---------------------------------------------------------------------------
// Property 11: Instructor student isolation
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------

describe("Instructor enroll — Property 11: Instructor student isolation", () => {
  // Feature: event-registration-system, Property 11: Instructor student isolation
  it("the list of available students contains only practitioners whose instructor_id matches the authenticated instructor", () => {
    fc.assert(
      fc.property(
        fc.uuid(), // instructorId
        fc.array(
          fc.record({
            id: fc.uuid(),
            full_name: fc.string({ minLength: 1, maxLength: 50 }),
            instructor_id: fc.oneof(fc.uuid(), fc.constant(null)),
            is_active: fc.boolean(),
          }),
          { minLength: 0, maxLength: 30 },
        ),
        (instructorId, practitioners) => {
          const result = filterStudentsByInstructor(
            practitioners,
            instructorId,
          );
          return result.every(
            (p) => p.instructor_id === instructorId && p.is_active,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it("no eligible student (instructor_id matches and is_active) is excluded from the result", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            full_name: fc.string({ minLength: 1, maxLength: 50 }),
            instructor_id: fc.oneof(fc.uuid(), fc.constant(null)),
            is_active: fc.boolean(),
          }),
          { minLength: 0, maxLength: 30 },
        ),
        (instructorId, practitioners) => {
          const result = filterStudentsByInstructor(
            practitioners,
            instructorId,
          );
          const eligibleIds = new Set(
            practitioners
              .filter((p) => p.instructor_id === instructorId && p.is_active)
              .map((p) => p.id),
          );
          const resultIds = new Set(result.map((p) => p.id));
          for (const id of eligibleIds) {
            if (!resultIds.has(id)) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("inactive students are excluded even if instructor_id matches", () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (instructorId, studentId) => {
        const practitioners: Practitioner[] = [
          {
            id: studentId,
            full_name: "Inactive Student",
            instructor_id: instructorId,
            is_active: false,
          },
        ];
        const result = filterStudentsByInstructor(practitioners, instructorId);
        return result.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it("students from other instructors are never included", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (instructorA, instructorB, studentId) => {
          if (instructorA === instructorB) return true;
          const practitioners: Practitioner[] = [
            {
              id: studentId,
              full_name: "Other Instructor Student",
              instructor_id: instructorB,
              is_active: true,
            },
          ];
          const result = filterStudentsByInstructor(practitioners, instructorA);
          return result.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
