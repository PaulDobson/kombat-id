/**
 * Typed result returned by all Server Actions.
 *
 * Usage:
 *   async function myAction(): Promise<ActionResult<MyData>> { ... }
 *
 * On success: { success: true, data: T }
 * On failure: { success: false, error: string }
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
