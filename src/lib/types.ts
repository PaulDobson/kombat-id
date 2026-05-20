/**
 * Shared ActionResult type used by all Server Actions.
 * Eliminates the local redefinition in every action file.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };
