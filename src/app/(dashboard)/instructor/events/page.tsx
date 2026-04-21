import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { EventType } from "@/types/database.types";
import { formatDateWithWeekday } from "@/lib/format-date";
import {
  formatRegistrationFee,
  hasCapacity,
} from "@/modules/event-registration/domain/entities/eventRegistration";
import { DrizzleEventRegistrationRepository } from "@/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository";
import { EventDetailDialog } from "./EventDetailDialog";

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"];

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

export default async function InstructorEventsPage() {
  const user = await requireUser();

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner || !INSTRUCTOR_ROLES.includes(practitioner.role ?? "")) {
    redirect("/dashboard");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: eventRows } = await adminSupabase
    .from("martial_events")
    .select("*")
    .gt("event_date", today)
    .order("event_date", { ascending: true });

  const events = (eventRows ?? []) as unknown as Array<{
    id: string;
    name: string;
    event_type: EventType;
    event_date: string;
    location: string | null;
    description: string | null;
    cover_image_path: string | null;
    registration_fee: number | null;
    max_participants: number | null;
  }>;

  // Fetch confirmed counts for all events to show capacity
  const repo = new DrizzleEventRegistrationRepository();
  const confirmedCounts = await Promise.all(
    events.map((e) => repo.countConfirmedByEvent(e.id)),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href="/instructor"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-2">
          Eventos disponibles
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Inscribe a tus alumnos en los próximos eventos
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              No hay eventos próximos disponibles.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Precio
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Aforo disponible
                  </th>
                  <th className="px-4 py-3 w-36" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {events.map((event, idx) => {
                  const confirmed = confirmedCounts[idx] ?? 0;
                  const capacity = hasCapacity(
                    event.max_participants,
                    confirmed,
                  );
                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-neutral-100 font-medium">
                          {event.name}
                        </p>
                        {event.location && (
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {event.location}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type]}`}
                        >
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-300 text-xs capitalize">
                        {formatDateWithWeekday(event.event_date)}
                      </td>
                      <td className="px-4 py-3 text-neutral-300 text-xs hidden md:table-cell">
                        {formatRegistrationFee(event.registration_fee)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {event.max_participants != null ? (
                          <span
                            className={`text-xs font-medium tabular-nums ${capacity ? "text-neutral-300" : "text-error-400"}`}
                          >
                            {capacity
                              ? `${event.max_participants - confirmed} lugares disponibles`
                              : "Sin cupos"}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500">
                            Sin límite
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EventDetailDialog
                            event={event}
                            trigger={
                              <button className="text-neutral-400 hover:text-neutral-200 text-xs underline underline-offset-2 transition-colors">
                                Ver detalle
                              </button>
                            }
                          />
                          {capacity ? (
                            <Link
                              href={`/instructor/events/${event.id}/enroll`}
                              className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Inscribir alumnos
                            </Link>
                          ) : (
                            <span className="text-xs text-neutral-600 italic">
                              Aforo completo
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
