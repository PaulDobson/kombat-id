import "server-only";

import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";

export interface UpcomingEvent {
  id: string;
  name: string;
  event_type: string;
  event_date: string;
  location: string | null;
}

/**
 * Retorna los próximos `limit` eventos cuya fecha sea >= hoy, ordenados por fecha ascendente.
 * Solo lectura — no pertenece a una clase repositorio porque no hay un dominio
 * de "evento" independiente todavía.
 */
export async function getUpcomingEvents(
  limit: number,
): Promise<UpcomingEvent[]> {
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
