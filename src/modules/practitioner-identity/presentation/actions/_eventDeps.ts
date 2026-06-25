import { adminSupabase } from "@/lib/supabase/admin";

export const EVENT_FILES_BUCKET = "event-files";

/**
 * Punto único de composición para acciones de eventos.
 */
export function createEventAdminClient() {
  return adminSupabase;
}
