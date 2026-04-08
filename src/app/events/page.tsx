import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { EventType } from "@/types/database.types";

// Página pública — sin autenticación requerida

async function getAdminStatus(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await adminSupabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<EventType, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  exam: "bg-success-900/50 text-success-400 border border-success-800",
};

import { formatDateShort as formatDate } from "@/lib/format-date";

export default async function PublicEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const isAdmin = await getAdminStatus();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("martial_events")
    .select("id, name, event_type, event_date, location")
    .order("event_date", { ascending: false });

  if (params.type && ["competition", "seminar", "exam"].includes(params.type)) {
    query = query.eq("event_type", params.type);
  }
  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }

  const { data: events } = await query;
  const eventList: {
    id: string;
    name: string;
    event_type: EventType;
    event_date: string;
    location: string | null;
  }[] = events ?? [];

  const upcoming = eventList.filter((e) => e.event_date >= today);
  const past = eventList.filter((e) => e.event_date < today);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-50 tracking-tight">
              Eventos Kombat Taekwondo Chile
            </h1>
            <p className="text-neutral-400 mt-2 text-sm">
              Competencias, seminarios y exámenes oficiales de la organización.
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin/events"
              className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Gestionar eventos
            </Link>
          )}
        </div>
      </div>

      {/* Filtros */}
      <form
        method="GET"
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 mb-8 flex flex-wrap gap-3"
      >
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nombre..."
          className="flex-1 min-w-[180px] px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Todos los tipos</option>
          <option value="competition">Competencia</option>
          <option value="seminar">Seminario</option>
          <option value="exam">Examen</option>
        </select>
        <button
          type="submit"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Filtrar
        </button>
        {(params.q || params.type) && (
          <Link
            href="/events"
            className="hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {eventList.length === 0 ? (
        <p className="text-neutral-500 text-sm text-center py-12">
          No se encontraron eventos.
        </p>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
                Próximos eventos
              </h2>
              <EventGrid events={upcoming} today={today} />
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
                Eventos pasados
              </h2>
              <EventGrid events={past} today={today} />
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function EventGrid({
  events,
  today,
}: {
  events: {
    id: string;
    name: string;
    event_type: EventType;
    event_date: string;
    location: string | null;
  }[];
  today: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => {
        const isPast = event.event_date < today;
        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-3 hover:border-neutral-500 hover:bg-neutral-800/60 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type]}`}
              >
                {EVENT_TYPE_LABELS[event.event_type]}
              </span>
              {isPast ? (
                <span className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                  Pasado
                </span>
              ) : (
                <span className="bg-success-900/50 text-success-400 border border-success-800 px-2 py-0.5 rounded-full text-xs">
                  Próximo
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-neutral-50 group-hover:text-primary-300 transition-colors">
              {event.name}
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-neutral-400">
                📅 {formatDate(event.event_date)}
              </p>
              {event.location && (
                <p className="text-sm text-neutral-400">📍 {event.location}</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
