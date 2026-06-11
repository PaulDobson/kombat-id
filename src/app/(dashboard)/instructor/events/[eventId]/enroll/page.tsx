import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { EventType } from "@/types/database.types";
import { formatDateWithWeekday } from "@/lib/format-date";
import {
  formatRegistrationFee,
  hasCapacity,
} from "@/modules/event-registration/domain/entities/eventRegistration";
import { DrizzleEventRegistrationRepository } from "@/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository";
import { EnrollTabs } from "./EnrollTabs";
import { SelfEnrollSection } from "./SelfEnrollSection";
import type { Registration } from "./EnrollTabs";

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

export default async function EnrollPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await requireUser();
  const { eventId } = await params;

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner || !INSTRUCTOR_ROLES.includes(practitioner.role ?? "")) {
    redirect("/dashboard");
  }

  // Fetch event
  const { data: eventRow } = await adminSupabase
    .from("martial_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!eventRow) notFound();

  const event = eventRow as unknown as {
    id: string;
    name: string;
    event_type: EventType;
    event_date: string;
    location: string | null;
    registration_fee: number | null;
    max_participants: number | null;
  };

  const repo = new DrizzleEventRegistrationRepository();
  const [confirmedCount, allRegistrations] = await Promise.all([
    repo.countConfirmedByEvent(eventId),
    repo.findByEvent(eventId),
  ]);

  const capacity = hasCapacity(event.max_participants, confirmedCount);

  // Only show registrations that belong to this instructor
  const myRegistrations: Registration[] = allRegistrations
    .filter((r) => r.instructorId === practitioner.id)
    .map((r) => ({
      id: r.id,
      practitionerId: r.practitionerId,
      practitionerName: r.practitionerName,
      status: r.status as Registration["status"],
      registeredAt: r.registeredAt,
    }));

  // Fetch instructor's active students via academy membership
  const { data: instructorAcademyRows } = await adminSupabase
    .from("academies")
    .select("id")
    .contains("responsible_instructor_ids", [practitioner.id]);

  const instructorAcademyIds = (instructorAcademyRows ?? []).map(
    (a: { id: string }) => a.id,
  );

  let studentRows: Array<{
    id: string;
    full_name: string;
    grade: string;
    dan: number | null;
  }> = [];
  if (instructorAcademyIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id")
      .in("academy_id", instructorAcademyIds);

    const memberIds = (memberships ?? []).map(
      (m: { practitioner_id: string }) => m.practitioner_id,
    );

    if (memberIds.length > 0) {
      const { data: rows } = await adminSupabase
        .from("practitioners")
        .select("id, full_name, grade, dan")
        .in("id", memberIds)
        .eq("role", "alumno")
        .eq("is_active", true)
        .order("full_name");
      studentRows = (rows ?? []) as typeof studentRows;
    }
  }

  const students = studentRows as Array<{
    id: string;
    full_name: string;
    grade: string;
    dan: number | null;
  }>;

  const isCompetition = event.event_type === "competition";

  // Check if the instructor is self-enrolled
  const selfRegistration = await repo.findByPractitionerAndEvent(
    practitioner.id as string,
    eventId,
  );
  const selfRegistrationStatus =
    (selfRegistration?.status as
      | "confirmada"
      | "pendiente_pago"
      | "cancelada"
      | null) ?? null;

  const capacityPercentage = event.max_participants
    ? Math.round((confirmedCount / event.max_participants) * 100)
    : 0;
  const availableSpots = event.max_participants
    ? event.max_participants - confirmedCount
    : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/instructor/events"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200 transition-all hover:gap-3 group"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver a eventos
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-600/20 via-neutral-900 to-neutral-900 border border-primary-500/30 p-8 sm:p-10">
        {/* Decorative gradient orb */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-300 bg-primary-500/20 border border-primary-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {EVENT_TYPE_LABELS[event.event_type]}
            </span>
            {!capacity && (
              <span className="inline-flex items-center gap-2 text-sm font-medium bg-error-500/20 text-error-300 border border-error-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm animate-pulse">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Aforo completo
              </span>
            )}
            {capacity && availableSpots && availableSpots <= 5 && (
              <span className="inline-flex items-center gap-2 text-sm font-medium bg-warning-500/20 text-warning-300 border border-warning-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                ¡Solo {availableSpots} cupos disponibles!
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-50 tracking-tight">
            {event.name}
          </h1>

          <p className="text-neutral-300 text-base max-w-2xl">
            Inscribe a tus alumnos en este{" "}
            {EVENT_TYPE_LABELS[event.event_type]?.toLowerCase() ?? "evento"} y
            ayúdalos a seguir creciendo en su camino marcial.
          </p>
        </div>
      </div>

      {/* Event detail cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fecha */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 hover:border-neutral-600 transition-all hover:shadow-lg hover:shadow-primary-500/5 group">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-500/10 rounded-lg border border-primary-500/20 group-hover:bg-primary-500/20 transition-colors">
              <svg
                className="w-5 h-5 text-primary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                Fecha
              </dt>
              <dd className="text-neutral-100 font-semibold capitalize text-sm leading-tight">
                {formatDateWithWeekday(event.event_date)}
              </dd>
            </div>
          </div>
        </div>

        {/* Precio */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 hover:border-neutral-600 transition-all hover:shadow-lg hover:shadow-primary-500/5 group">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                Precio
              </dt>
              <dd className="text-neutral-100 font-semibold text-sm">
                {formatRegistrationFee(event.registration_fee)}
              </dd>
            </div>
          </div>
        </div>

        {/* Aforo */}
        {event.max_participants != null && (
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 hover:border-neutral-600 transition-all hover:shadow-lg hover:shadow-primary-500/5 group">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg border transition-colors ${
                  capacity
                    ? "bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20"
                    : "bg-error-500/10 border-error-500/20 group-hover:bg-error-500/20"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${capacity ? "text-blue-400" : "text-error-400"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <dt className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                  Aforo
                </dt>
                <dd className="space-y-2">
                  <div
                    className={`font-bold text-lg ${capacity ? "text-neutral-100" : "text-error-400"}`}
                  >
                    {confirmedCount} / {event.max_participants}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        capacityPercentage >= 90
                          ? "bg-error-500"
                          : capacityPercentage >= 70
                            ? "bg-warning-500"
                            : "bg-primary-500"
                      }`}
                      style={{ width: `${capacityPercentage}%` }}
                    />
                  </div>
                  {availableSpots !== null && availableSpots > 0 && (
                    <p className="text-xs text-neutral-500">
                      {availableSpots}{" "}
                      {availableSpots === 1
                        ? "cupo disponible"
                        : "cupos disponibles"}
                    </p>
                  )}
                </dd>
              </div>
            </div>
          </div>
        )}

        {/* Ubicación */}
        {event.location && (
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 hover:border-neutral-600 transition-all hover:shadow-lg hover:shadow-primary-500/5 group">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <dt className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">
                  Lugar
                </dt>
                <dd className="text-neutral-100 font-semibold text-sm leading-tight">
                  {event.location}
                </dd>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* My enrollment section — instructor can enroll themselves */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
          <span className="w-1 h-4 bg-primary-500 rounded-full" />
          Mi participación
        </h2>
        <SelfEnrollSection
          eventId={eventId}
          selfRegistrationStatus={selfRegistrationStatus}
          registrationFee={event.registration_fee}
        />
      </div>

      {/* Tabs — Students enrollment */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
          <span className="w-1 h-4 bg-emerald-500 rounded-full" />
          Inscripción de alumnos
        </h2>
        {!capacity &&
        myRegistrations.filter((r) => r.status !== "cancelada").length === 0 ? (
          <div className="relative overflow-hidden bg-linear-to-br from-error-500/10 to-error-500/5 border border-error-500/30 rounded-2xl p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(239,68,68,0.1),transparent)]" />
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-error-500/20 rounded-full border border-error-500/30 mb-2">
                <svg
                  className="w-8 h-8 text-error-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-error-300">
                Aforo Completo
              </h3>
              <p className="text-error-400 text-sm max-w-md mx-auto">
                Este evento ha alcanzado el aforo máximo. No es posible
                inscribir más alumnos en este momento.
              </p>
            </div>
          </div>
        ) : (
          <EnrollTabs
            eventId={eventId}
            students={students}
            registrations={myRegistrations}
            isCompetition={isCompetition}
          />
        )}
      </div>
    </main>
  );
}
