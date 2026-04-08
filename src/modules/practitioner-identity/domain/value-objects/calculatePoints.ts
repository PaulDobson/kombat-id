/**
 * Calculates ranking points for a competition result.
 *
 * Points table:
 * - '1st'         → 100
 * - '2nd'         → 70
 * - '3rd'         → 50
 * - 'participant' → 10
 * - any other     → 0
 *
 * Requirements: 4.3
 */
export function calculatePoints(result: string | null): number {
  switch (result) {
    case "1st":
      return 100;
    case "2nd":
      return 70;
    case "3rd":
      return 50;
    case "participant":
      return 10;
    default:
      return 0;
  }
}
