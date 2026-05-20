import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DrizzleEventRegistrationRepository } from "@/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository";
import { RegistrationsGrouped } from "./RegistrationsGrouped";
import { RegistrationsList } from "./RegistrationsList";
import { RegistrationsStats } from "./RegistrationsStats";
import type { RegistrationRow } from "./RegistrationsGrouped";
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
  const registrations = await repo.findByEvent(eventId);

  // Derivar conteos desde los datos ya cargados (elimina 2 consultas extra a BD)
  const statusCounts = { pendiente_pago: 0, confirmada: 0, cancelada: 0 };
  let confirmedCount = 0;
  for (const r of registrations) {
    if (r.status === "pendiente_pago") statusCounts.pendiente_pago++;
    else if (r.status === "confirmada") {
      statusCounts.confirmada++;
      confirmedCount++;
    } else if (r.status === "cancelada") statusCounts.cancelada++;
  }

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
  const rutById = new Map<string, string>();

  if (practitionerIds.length > 0) {
    // Obtener academia (join embebido) y RUT en paralelo — 2 consultas en vez de 3
    type AcademyInfo = {
      id: string;
      name: string;
      city: string;
      region: string;
    };
    type MembershipWithAcademy = {
      practitioner_id: string;
      academies: AcademyInfo | AcademyInfo[] | null;
    };

    const [membershipsResult, rutsResult] = await Promise.all([
      adminSupabase
        .from("academy_memberships")
        .select("practitioner_id, academies(id, name, city, region)")
        .in("practitioner_id", practitionerIds)
        .eq("is_active", true),
      adminSupabase
        .from("practitioners")
        .select("id, rut")
        .in("id", practitionerIds),
    ]);

    for (const p of rutsResult.data ?? []) {
      rutById.set(p.id, p.rut);
    }

    for (const m of (membershipsResult.data ?? []) as MembershipWithAcademy[]) {
      if (academyByPractitioner.has(m.practitioner_id)) continue;
      // Supabase puede devolver la relación embebida como objeto o array
      const raw = m.academies;
      const academy = Array.isArray(raw) ? raw[0] : raw;
      if (academy) academyByPractitioner.set(m.practitioner_id, academy);
    }
  }

  const enrichedRegistrations: RegistrationRow[] = registrations.map((reg) => {
    const academy = academyByPractitioner.get(reg.practitionerId) ?? null;
    return {
      id: reg.id,
      practitionerId: reg.practitionerId,
      practitionerName: reg.practitionerName,
      instructorName: reg.instructorName,
      rut: rutById.get(reg.practitionerId) ?? null,
      status: reg.status,
      registeredAt: reg.registeredAt,
      notes: reg.notes ?? null,
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-200 transition-colors group mb-3"
        >
          <svg
            className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
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
          Volver al evento
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">
          {event.name}
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Gestión de inscripciones
        </p>
      </div>

      {/* Stats */}
      <RegistrationsStats
        statusCounts={statusCounts}
        totalRegistrations={totalRegistrations}
        maxParticipants={maxParticipants}
        confirmedCount={confirmedCount}
      />

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700/60 rounded-xl p-1 self-start">
        <Link
          href={`/admin/events/${eventId}/registrations?vista=agrupado`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            view === "agrupado"
              ? "bg-neutral-700 text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-300"
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            view === "lista"
              ? "bg-neutral-700 text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-300"
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
        <RegistrationsList
          registrations={enrichedRegistrations}
          eventId={eventId}
        />
      )}
    </main>
  );
}
