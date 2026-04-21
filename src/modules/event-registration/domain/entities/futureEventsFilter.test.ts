import { describe, it } from "vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Pure helper that mirrors the DB filter used in the instructor events page:
// returns only events with event_date strictly greater than today.
// ---------------------------------------------------------------------------

function filterFutureEvents<T extends { event_date: string }>(
  events: T[],
  today: string,
): T[] {
  return events.filter((e) => e.event_date > today);
}

// ---------------------------------------------------------------------------
// Arbitrary: generates a date string in YYYY-MM-DD format
// ---------------------------------------------------------------------------

function padTwo(n: number): string {
  return String(n).padStart(2, "0");
}

const dateStringArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // use 28 to avoid invalid dates
  })
  .map(({ year, month, day }) => `${year}-${padTwo(month)}-${padTwo(day)}`);

// ---------------------------------------------------------------------------
// Property 10: Future events filter
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------

describe("Instructor events — Property 10: Future events filter", () => {
  // Feature: event-registration-system, Property 10: Future events filter
  it("all events returned by the filter have event_date strictly greater than today", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            event_date: dateStringArb,
          }),
          { minLength: 0, maxLength: 30 },
        ),
        dateStringArb,
        (events, today) => {
          const result = filterFutureEvents(events, today);
          return result.every((e) => e.event_date > today);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("no future event is excluded from the result", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            event_date: dateStringArb,
          }),
          { minLength: 0, maxLength: 30 },
        ),
        dateStringArb,
        (events, today) => {
          const result = filterFutureEvents(events, today);
          const futureIds = new Set(
            events.filter((e) => e.event_date > today).map((e) => e.id),
          );
          const resultIds = new Set(result.map((e) => e.id));
          for (const id of futureIds) {
            if (!resultIds.has(id)) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("events with event_date equal to today are excluded", () => {
    fc.assert(
      fc.property(dateStringArb, (today) => {
        const events = [
          { id: "same-day", name: "Today Event", event_date: today },
        ];
        const result = filterFutureEvents(events, today);
        return result.length === 0;
      }),
      { numRuns: 100 },
    );
  });
});
