import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { EventType } from "@/types/database.types";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/");
  return user;
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

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("martial_events")
    .select("*")
    .order("event_date", { ascending: false });

  if (params.type && ["competition", "seminar", "exam"].includes(params.type)) {
    query = query.eq("event_type", params.type);
  }
  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }

  const { data: events, error } = await query;
  if (error) console.error("[AdminEventsPage]", error);

  const eventList = events ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Eventos marciales
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Competencias, seminarios y exámenes de la organización
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo evento
        </Link>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 mb-6 flex flex-wrap gap-3"
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
            href="/admin/events"
            className="hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {eventList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-sm">
              No se encontraron eventos.
            </p>
            <Link
              href="/admin/events/new"
              className="inline-block mt-3 text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Crear el primer evento →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  Lugar
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {eventList.map(
                (event: {
                  id: string;
                  name: string;
                  event_type: EventType;
                  event_date: string;
                  location: string | null;
                }) => {
                  const isPast = event.event_date < today;
                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-neutral-100 font-medium">
                        {event.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type]}`}
                        >
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-300 tabular-nums">
                        {formatDate(event.event_date)}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 hidden sm:table-cell">
                        {event.location ?? (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isPast ? (
                          <span className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                            Pasado
                          </span>
                        ) : (
                          <span className="bg-success-900/50 text-success-400 border border-success-800 px-2 py-0.5 rounded-full text-xs">
                            Próximo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        )}
      </div>

      {eventList.length > 0 && (
        <p className="text-xs text-neutral-600 mt-3 text-right">
          {eventList.length} evento{eventList.length !== 1 ? "s" : ""}
        </p>
      )}
    </main>
  );
}
