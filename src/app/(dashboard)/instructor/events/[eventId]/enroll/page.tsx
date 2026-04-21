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
      .in("academy_id", instructorAcademyIds)
      .eq("is_active", true);

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

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/instructor/events"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver a eventos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-2">
          {event.name}
        </h1>
      </div>

      {/* Event detail card */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-neutral-500 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">
            {EVENT_TYPE_LABELS[event.event_type]}
          </span>
          {!capacity && (
            <span className="text-xs bg-error-500/10 text-error-400 border border-error-500/20 px-2 py-0.5 rounded-full">
              Aforo completo
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
              Fecha
            </dt>
            <dd className="text-neutral-200 capitalize">
              {formatDateWithWeekday(event.event_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
              Precio
            </dt>
            <dd className="text-neutral-200">
              {formatRegistrationFee(event.registration_fee)}
            </dd>
          </div>
          {event.max_participants != null && (
            <div>
              <dt className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                Aforo
              </dt>
              <dd
                className={`font-medium ${capacity ? "text-neutral-200" : "text-error-400"}`}
              >
                {confirmedCount} / {event.max_participants}
              </dd>
            </div>
          )}
          {event.location && (
            <div>
              <dt className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                Lugar
              </dt>
              <dd className="text-neutral-200">{event.location}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Tabs */}
      {!capacity &&
      myRegistrations.filter((r) => r.status !== "cancelada").length === 0 ? (
        <div className="bg-error-500/10 border border-error-500/20 rounded-xl p-6 text-center">
          <p className="text-error-400 text-sm font-medium">
            Este evento ha alcanzado el aforo máximo. No es posible inscribir
            más alumnos.
          </p>
        </div>
      ) : (
        <EnrollTabs
          eventId={eventId}
          students={students}
          registrations={myRegistrations}
          isCompetition={isCompetition}
        />
      )}
    </main>
  );
}
