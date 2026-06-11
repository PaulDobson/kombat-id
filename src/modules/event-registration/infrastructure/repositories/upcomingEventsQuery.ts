import "server-only";

import { unstable_cache } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";

export interface UpcomingEvent {
  id: string;
  name: string;
  event_type: string;
  event_date: string;
  location: string | null;
}

async function _getUpcomingEvents(limit: number): Promise<UpcomingEvent[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await adminSupabase
    .from("martial_events")
    .select("id, name, event_type, event_date, location")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) {
    throw new DomainError(
      `Error al obtener próximos eventos: ${error.message}`,
    );
  }

  return (data ?? []) as UpcomingEvent[];
}

/**
 * Retorna los próximos `limit` eventos cuya fecha sea >= hoy, ordenados por fecha ascendente.
 * Cached for 5 minutes — events don't change frequently and this query is called
 * on every page render (DashboardNav, landing, dashboard pages).
 */
export const getUpcomingEvents = unstable_cache(
  _getUpcomingEvents,
  ["upcoming-events"],
  { revalidate: 300, tags: ["martial-events"] },
);
