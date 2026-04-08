/**
 * Calculates ranking points for an international competition result.
 *
 * Applies a 1.5x multiplier over the base points defined in Requirement 4.3,
 * rounding to the nearest integer.
 *
 * Requirements: 11.2
 */
export function calculateInternationalPoints(basePoints: number): number {
  return Math.round(basePoints * 1.5);
}
