import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DrizzleEventRegistrationRepository } from "@/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository";
import { ConfirmPaymentButton } from "./ConfirmPaymentButton";
import { CancelRegistrationButton } from "./CancelRegistrationButton";
import { RegistrationsGrouped } from "./RegistrationsGrouped";
import type { RegistrationRow } from "./RegistrationsGrouped";
import { formatDateShort } from "@/lib/format-date";
import type { Database } from "@/types/database.types";

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

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: "Pendiente pago",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  pendiente_pago:
    "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  confirmada: "bg-success-900/50 text-success-400 border border-success-800",
  cancelada: "bg-neutral-800 text-neutral-500 border border-neutral-700",
};

type ViewMode = "agrupado" | "lista";

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  await requireAdminUser();
  const { eventId } = await params;
  const sp = await searchParams;
  const view: ViewMode = sp.vista === "lista" ? "lista" : "agrupado";

  const { data: event } = (await adminSupabase
    .from("martial_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()) as { data: MartialEvent | null };

  if (!event) notFound();

  const repo = new DrizzleEventRegistrationRepository();
  const [registrations, statusCounts, confirmedCount] = await Promise.all([
    repo.findByEvent(eventId),
    repo.countByEventGroupedByStatus(eventId),
    repo.countConfirmedByEvent(eventId),
  ]);

  const maxParticipants = event.max_participants;
  const totalRegistrations =
    statusCounts.pendiente_pago +
    statusCounts.confirmada +
    statusCounts.cancelada;

  // ── Enrich registrations with academy data ──────────────────────────────
  // Get academy memberships for all practitioners in this event
  const practitionerIds = [
    ...new Set(registrations.map((r) => r.practitionerId)),
  ];

  const academyByPractitioner = new Map<
    string,
    { id: string; name: string; city: string; region: string }
  >();

  if (practitionerIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id, academy_id")
      .in("practitioner_id", practitionerIds)
      .eq("is_active", true);

    if (memberships && memberships.length > 0) {
      const academyIds = [...new Set(memberships.map((m) => m.academy_id))];
      const { data: academies } = await adminSupabase
        .from("academies")
        .select("id, name, city, region")
        .in("id", academyIds);

      const academyMap = new Map(
        (academies ?? []).map((a) => [
          a.id,
          a as { id: string; name: string; city: string; region: string },
        ]),
      );

      // Use first active membership per practitioner
      for (const m of memberships) {
        if (!academyByPractitioner.has(m.practitioner_id)) {
          const academy = academyMap.get(m.academy_id);
          if (academy) academyByPractitioner.set(m.practitioner_id, academy);
        }
      }
    }
  }

  const enrichedRegistrations: RegistrationRow[] = registrations.map((reg) => {
    const academy = academyByPractitioner.get(reg.practitionerId) ?? null;
    return {
      id: reg.id,
      practitionerName: reg.practitionerName,
      instructorName: reg.instructorName,
      status: reg.status,
      registeredAt: reg.registeredAt,
      academyId: academy?.id ?? null,
      academyName: academy?.name ?? null,
      academyCity: academy?.city ?? null,
      academyRegion: academy?.region ?? null,
    };
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/admin/events/${eventId}`}
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al evento
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-2">
          Inscripciones — {event.name}
        </h1>
      </div>

      {/* Stats header */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Total
              </span>
              <span className="text-neutral-100 font-semibold tabular-nums">
                {totalRegistrations}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES.pendiente_pago}`}
              >
                Pendiente pago
              </span>
              <span className="text-neutral-100 font-semibold tabular-nums">
                {statusCounts.pendiente_pago}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES.confirmada}`}
              >
                Confirmada
              </span>
              <span className="text-neutral-100 font-semibold tabular-nums">
                {statusCounts.confirmada}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES.cancelada}`}
              >
                Cancelada
              </span>
              <span className="text-neutral-100 font-semibold tabular-nums">
                {statusCounts.cancelada}
              </span>
            </div>
          </div>

          {maxParticipants != null && (
            <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Aforo
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${confirmedCount >= maxParticipants ? "text-error-400" : "text-neutral-100"}`}
              >
                {confirmedCount} / {maxParticipants}
              </span>
              <span className="text-xs text-neutral-500">
                inscritos confirmados
              </span>
            </div>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/events/${eventId}/registrations?vista=agrupado`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            view === "agrupado"
              ? "bg-neutral-900 border-neutral-600 text-neutral-100"
              : "bg-transparent border-neutral-700 text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11H5m14-7H5m14 14H5"
            />
          </svg>
          Por academia
        </Link>
        <Link
          href={`/admin/events/${eventId}/registrations?vista=lista`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            view === "lista"
              ? "bg-neutral-900 border-neutral-600 text-neutral-100"
              : "bg-transparent border-neutral-700 text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          Lista completa
        </Link>
      </div>

      {/* Content */}
      {view === "agrupado" ? (
        <RegistrationsGrouped
          registrations={enrichedRegistrations}
          eventId={eventId}
        />
      ) : (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          {registrations.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-neutral-500 text-sm">
                No hay inscripciones para este evento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900/80">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Alumno
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Instructor
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Academia
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {registrations.map((reg) => {
                    const academy = academyByPractitioner.get(
                      reg.practitionerId,
                    );
                    return (
                      <tr
                        key={reg.id}
                        className="hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-neutral-100 font-medium">
                            {reg.practitionerName || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-neutral-300">
                            {reg.instructorName || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {academy ? (
                            <div>
                              <p className="text-neutral-300 text-xs">
                                {academy.name}
                              </p>
                              <p className="text-neutral-500 text-xs">
                                {academy.city}
                              </p>
                            </div>
                          ) : (
                            <span className="text-neutral-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[reg.status] ?? STATUS_STYLES.cancelada}`}
                          >
                            {STATUS_LABELS[reg.status] ?? reg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs tabular-nums hidden sm:table-cell">
                          {formatDateShort(reg.registeredAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {reg.status === "pendiente_pago" && (
                              <ConfirmPaymentButton
                                registrationId={reg.id}
                                eventId={eventId}
                              />
                            )}
                            {reg.status !== "cancelada" && (
                              <CancelRegistrationButton
                                registrationId={reg.id}
                                eventId={eventId}
                              />
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
      )}
    </main>
  );
}
