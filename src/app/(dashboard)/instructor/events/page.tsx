import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { EventType } from "@/types/database.types";
import { isInstructorRole } from "@/lib/roles";
import { formatDateWithWeekday } from "@/lib/format-date";
import {
  formatRegistrationFee,
  hasCapacity,
} from "@/modules/event-registration/domain/entities/eventRegistration";
import { DrizzleEventRegistrationRepository } from "@/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository";
import { EventDetailDialog } from "./EventDetailDialog";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Banknote,
  Swords,
  BookOpen,
  GraduationCap,
  ChevronRight,
} from "lucide-react";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<EventType, string> = {
  competition:
    "bg-primary-500/10 text-primary-400 border border-primary-500/25",
  seminar: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  exam: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
};

const EVENT_TYPE_ICON: Record<EventType, React.ElementType> = {
  competition: Swords,
  seminar: BookOpen,
  exam: GraduationCap,
};

export default async function InstructorEventsPage() {
  const user = await requireUser();

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner || !isInstructorRole(practitioner.role ?? "")) {
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

  const repo = new DrizzleEventRegistrationRepository();
  const confirmedCounts = await Promise.all(
    events.map((e) => repo.countConfirmedByEvent(e.id)),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al panel
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
              Eventos disponibles
            </h1>
            <p className="text-sm text-neutral-400">
              {events.length > 0
                ? `${events.length} evento${events.length !== 1 ? "s" : ""} próximo${events.length !== 1 ? "s" : ""}`
                : "Inscribe a tus alumnos en los próximos eventos"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {events.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-neutral-600" />
          </div>
          <p className="text-neutral-500 text-sm">
            No hay eventos próximos disponibles.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event, idx) => {
            const confirmed = confirmedCounts[idx] ?? 0;
            const capacity = hasCapacity(event.max_participants, confirmed);
            const TypeIcon = EVENT_TYPE_ICON[event.event_type];
            const available =
              event.max_participants != null
                ? event.max_participants - confirmed
                : null;

            return (
              <div
                key={event.id}
                className="bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-2xl p-5 flex flex-col gap-4 transition-colors"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                    <TypeIcon className="w-4 h-4 text-neutral-400" />
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${EVENT_TYPE_STYLES[event.event_type]}`}
                  >
                    {EVENT_TYPE_LABELS[event.event_type]}
                  </span>
                </div>

                {/* Title + meta */}
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-neutral-100 leading-snug">
                    {event.name}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                      <span className="capitalize">
                        {formatDateWithWeekday(event.event_date)}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                        {event.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <Banknote className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                      {formatRegistrationFee(event.registration_fee)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Users className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                      {available != null ? (
                        <span
                          className={
                            capacity
                              ? "text-neutral-400"
                              : "text-red-400 font-medium"
                          }
                        >
                          {capacity
                            ? `${available} lugar${available !== 1 ? "es" : ""} disponible${available !== 1 ? "s" : ""}`
                            : "Sin cupos disponibles"}
                        </span>
                      ) : (
                        <span className="text-neutral-500">
                          Sin límite de aforo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                  <EventDetailDialog
                    event={event}
                    trigger={
                      <button className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-neutral-300 font-medium transition-colors">
                        Ver detalle
                      </button>
                    }
                  />
                  {capacity ? (
                    <Link
                      href={`/instructor/events/${event.id}/enroll`}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Inscribir <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="flex-1 text-center text-xs text-neutral-600 italic py-2">
                      Aforo completo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
