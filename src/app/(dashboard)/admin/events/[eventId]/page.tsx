import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { EventType, Database } from "@/types/database.types";
import { DeleteEventButton } from "../DeleteEventButton";

type MartialEvent = Database["public"]["Tables"]["martial_events"]["Row"];

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

import {
  formatDateWithWeekday as formatDate,
  formatDateLong,
} from "@/lib/format-date";
import { formatRegistrationFee } from "@/modules/event-registration/domain/entities/eventRegistration";
import { DrizzleEventRegistrationRepository } from "@/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireAdminUser();
  const { eventId } = await params;

  const { data: event } = (await adminSupabase
    .from("martial_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()) as { data: MartialEvent | null };

  if (!event) notFound();

  // Count participants registered for this event
  const { count: participantCount } = await adminSupabase
    .from("martial_history")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  // Count confirmed registrations for capacity indicator
  const registrationRepo = new DrizzleEventRegistrationRepository();
  const confirmedCount = await registrationRepo.countConfirmedByEvent(eventId);

  const today = new Date().toISOString().slice(0, 10);
  const isPast = event.event_date < today;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/events"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver a eventos
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            {event.name}
          </h1>
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type as EventType]}`}
          >
            {EVENT_TYPE_LABELS[event.event_type as EventType]}
          </span>
          {isPast ? (
            <span className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs">
              Pasado
            </span>
          ) : (
            <span className="bg-success-900/50 text-success-400 border border-success-800 px-2.5 py-0.5 rounded-full text-xs">
              Próximo
            </span>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">
          Detalles del evento
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Fecha
            </dt>
            <dd className="text-neutral-200 capitalize">
              {formatDate(event.event_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Lugar
            </dt>
            <dd className="text-neutral-200">
              {event.location ?? (
                <span className="text-neutral-600">Sin especificar</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Participantes registrados
            </dt>
            <dd className="text-neutral-200">{participantCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Creado el
            </dt>
            <dd className="text-neutral-400 text-xs">
              {formatDateLong(event.created_at.slice(0, 10))}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Precio de inscripción
            </dt>
            <dd className="text-neutral-200">
              {formatRegistrationFee(event.registration_fee ?? null)}
            </dd>
          </div>
          {event.max_participants != null && (
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Aforo
              </dt>
              <dd className="text-neutral-200">
                {confirmedCount} / {event.max_participants} inscritos
              </dd>
            </div>
          )}
        </dl>
        {event.description && (
          <div className="mt-5 pt-5 border-t border-neutral-800">
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
              Descripción
            </dt>
            <dd className="text-neutral-200 text-sm whitespace-pre-wrap">
              {event.description}
            </dd>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">Acciones</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/events/${eventId}/edit`}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Editar evento
          </Link>
          <Link
            href={`/admin/events/${eventId}/registrations`}
            className="bg-primary-900/50 hover:bg-primary-900 text-primary-300 border border-primary-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Gestionar inscripciones
          </Link>
          <DeleteEventButton id={eventId} name={event.name} />
        </div>
      </div>
    </main>
  );
}
