import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DrizzleEventRegistrationRepository } from "@/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository";
import { AcademyStudentsTable } from "./AcademyStudentsTable";
import type { RegistrationRow } from "../../RegistrationsGrouped";
import type { Database } from "@/types/database.types";

type MartialEvent = Database["public"]["Tables"]["martial_events"]["Row"];

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION_LABELS: Record<string, string> = {
  arica_y_parinacota: "Arica y Parinacota",
  tarapaca: "Tarapacá",
  antofagasta: "Antofagasta",
  atacama: "Atacama",
  coquimbo: "Coquimbo",
  valparaiso: "Valparaíso",
  metropolitana: "Metropolitana",
  ohiggins: "O'Higgins",
  maule: "Maule",
  nuble: "Ñuble",
  biobio: "Biobío",
  araucania: "Araucanía",
  los_rios: "Los Ríos",
  los_lagos: "Los Lagos",
  aysen: "Aysén",
  magallanes: "Magallanes",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AcademyRegistrationsPage({
  params,
}: {
  params: Promise<{ eventId: string; academyId: string }>;
}) {
  await requireAdminUser();
  const { eventId, academyId } = await params;
  const isSinAcademia = academyId === "sin-academia";

  // ── Evento ────────────────────────────────────────────────────────────────
  const { data: event } = (await adminSupabase
    .from("martial_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()) as { data: MartialEvent | null };

  if (!event) notFound();

  // ── Academia (si aplica) ──────────────────────────────────────────────────
  let academyName = "Sin academia";
  let academyCity: string | null = null;
  let academyRegion: string | null = null;

  if (!isSinAcademia) {
    const { data: academy } = await adminSupabase
      .from("academies")
      .select("id, name, city, region")
      .eq("id", academyId)
      .maybeSingle();

    if (!academy) notFound();
    academyName = academy.name;
    academyCity = academy.city;
    academyRegion = academy.region;
  }

  // ── Inscripciones del evento ──────────────────────────────────────────────
  const repo = new DrizzleEventRegistrationRepository();
  const allRegistrations = await repo.findByEvent(eventId);

  const practitionerIds = [
    ...new Set(allRegistrations.map((r) => r.practitionerId)),
  ];

  // Enriquecer con academia y RUT
  type AcademyInfo = { id: string; name: string; city: string; region: string };
  type MembershipRow = {
    practitioner_id: string;
    academies: AcademyInfo | AcademyInfo[] | null;
  };

  const academyByPractitioner = new Map<string, string>(); // practitionerId → academyId
  const rutById = new Map<string, string>();

  if (practitionerIds.length > 0) {
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

    for (const m of (membershipsResult.data ?? []) as MembershipRow[]) {
      if (academyByPractitioner.has(m.practitioner_id)) continue;
      const raw = m.academies;
      const acad = Array.isArray(raw) ? raw[0] : raw;
      if (acad) academyByPractitioner.set(m.practitioner_id, acad.id);
    }
  }

  // Filtrar inscripciones por academia
  const filteredRegistrations = allRegistrations.filter((reg) => {
    const regAcademyId = academyByPractitioner.get(reg.practitionerId) ?? null;
    if (isSinAcademia) return regAcademyId === null;
    return regAcademyId === academyId;
  });

  const rows: RegistrationRow[] = filteredRegistrations.map((reg) => ({
    id: reg.id,
    practitionerId: reg.practitionerId,
    practitionerName: reg.practitionerName,
    instructorName: reg.instructorName,
    rut: rutById.get(reg.practitionerId) ?? null,
    status: reg.status,
    registeredAt: reg.registeredAt,
    notes: reg.notes ?? null,
    academyId: isSinAcademia ? null : academyId,
    academyName: isSinAcademia ? null : academyName,
    academyCity: academyCity,
    academyRegion: academyRegion,
  }));

  // Conteos
  const confirmed = rows.filter((r) => r.status === "confirmada").length;
  const pending = rows.filter((r) => r.status === "pendiente_pago").length;
  const cancelled = rows.filter((r) => r.status === "cancelada").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="space-y-1">
        <Link
          href={`/admin/events/${eventId}/registrations`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-200 transition-colors group"
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
          {event.name} · Inscripciones
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-50">
              {academyName}
            </h1>
            {(academyCity || academyRegion) && (
              <p className="text-sm text-neutral-400 mt-0.5">
                {[
                  academyCity,
                  academyRegion
                    ? (REGION_LABELS[academyRegion] ?? academyRegion)
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          {/* Badges resumen */}
          <div className="flex items-center gap-2 flex-wrap">
            {confirmed > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {confirmed} confirmada{confirmed !== 1 ? "s" : ""}
              </span>
            )}
            {pending > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-900/40 text-amber-400 border border-amber-800/60 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {pending} pendiente{pending !== 1 ? "s" : ""}
              </span>
            )}
            {cancelled > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-500 border border-neutral-700 text-xs font-medium">
                {cancelled} cancelada{cancelled !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de alumnos */}
      <AcademyStudentsTable rows={rows} eventId={eventId} />
    </main>
  );
}
