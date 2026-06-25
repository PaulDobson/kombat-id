import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import {
  getUpcomingEvents,
  type UpcomingEvent,
} from "@/modules/event-registration/infrastructure/repositories/upcomingEventsQuery";
import Link from "next/link";
import { GradeChart } from "./GradeChart";
import {
  GRADE_LABELS,
  REGION_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_STYLES,
} from "@/lib/presentation-constants";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";

import { formatDateShort as formatDate } from "@/lib/format-date";

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ region?: string }>;
}) {
  // requireAdmin() usa React.cache() — si DashboardNav ya llamó requireUser() +
  // getIsAdmin() en este mismo request, no se disparan queries adicionales.
  await requireAdmin();

  const sp = searchParams ? await searchParams : {};
  const regionFilter = sp.region ?? "";

  const academyRepo = new DrizzleAcademyRepository();

  // Grados definidos explícitamente para generación de consultas paralelas
  const GRADES = ["white", "yellow", "green", "blue", "red", "black"] as const;

  // Todas las queries en paralelo — DB hace el conteo, no Node.js
  const [
    { data: allAcademiesData },
    { count: totalCount },
    { count: activeCount },
    upcomingEvents,
    { count: pendingActivations },
    { count: pendingCertRequests },
    { count: pendingGradeExams },
    { count: pendingInstructorRequests },
    gradeCountResults,
  ] = await Promise.all([
    // Solo columnas necesarias para el dashboard (evita cargar description, founder_story, etc.)
    adminSupabase
      .from("academies")
      .select("id, name, region, city")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    // COUNT total de practicantes — solo un número, sin transferir filas
    adminSupabase
      .from("practitioners")
      .select("id", { count: "exact", head: true }),
    // COUNT activos — solo un número
    adminSupabase
      .from("practitioners")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    getUpcomingEvents(5),
    adminSupabase
      .from("practitioners")
      .select("id", { count: "exact", head: true })
      .is("auth_user_id", null)
      .eq("is_active", false),
    adminSupabase
      .from("certification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    adminSupabase
      .from("grade_exams")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_authorization"),
    adminSupabase
      .from("instructor_account_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    // Conteo por grado: 6 COUNT queries paralelas, sin transferir filas
    Promise.all(
      GRADES.map((grade) =>
        adminSupabase
          .from("practitioners")
          .select("id", { count: "exact", head: true })
          .eq("grade", grade),
      ),
    ),
  ]);

  // Filtro de región en memoria — el dataset de academias es pequeño (< 100)
  const allAcademies = allAcademiesData ?? [];
  const academies = regionFilter
    ? allAcademies.filter((a) => a.region === regionFilter)
    : allAcademies;

  const totalPractitioners = totalCount ?? 0;
  const activePractitioners = activeCount ?? 0;

  // Distribución por grado — construida desde conteos DB, sin scan de filas
  const gradeData = GRADES.map((grade, i) => ({
    grade,
    label: GRADE_LABELS[grade as Grade] ?? grade,
    count: gradeCountResults[i]?.count ?? 0,
  })).filter((d) => d.count > 0);

  // Conteo de practicantes por academia — batch query única
  const academyIds = academies.map((a) => a.id);
  const practitionerCountMap =
    await academyRepo.countActivePractitionersBatch(academyIds);

  const academyCounts = academies.map((a) => ({
    ...a,
    practitionerCount: practitionerCountMap.get(a.id) ?? 0,
  }));

  // Build attention items — only include non-zero counts
  const attentionItems: Array<{ label: string; href: string; count: number }> =
    [];
  if ((pendingActivations ?? 0) > 0) {
    attentionItems.push({
      label: `${pendingActivations} activación${(pendingActivations ?? 0) !== 1 ? "es" : ""} pendiente${(pendingActivations ?? 0) !== 1 ? "s" : ""}`,
      href: "/admin/practitioners/pending-activation",
      count: pendingActivations ?? 0,
    });
  }
  if ((pendingCertRequests ?? 0) > 0) {
    attentionItems.push({
      label: `${pendingCertRequests} solicitud${(pendingCertRequests ?? 0) !== 1 ? "es" : ""} de certificación pendiente${(pendingCertRequests ?? 0) !== 1 ? "s" : ""}`,
      href: "/admin/certification-requests",
      count: pendingCertRequests ?? 0,
    });
  }
  if ((pendingGradeExams ?? 0) > 0) {
    attentionItems.push({
      label: `${pendingGradeExams} examen${(pendingGradeExams ?? 0) !== 1 ? "es" : ""} de grado pendiente${(pendingGradeExams ?? 0) !== 1 ? "s" : ""} de autorización`,
      href: "/admin/grade-exams",
      count: pendingGradeExams ?? 0,
    });
  }
  if ((pendingInstructorRequests ?? 0) > 0) {
    attentionItems.push({
      label: `${pendingInstructorRequests} solicitud${(pendingInstructorRequests ?? 0) !== 1 ? "es" : ""} de instructor pendiente${(pendingInstructorRequests ?? 0) !== 1 ? "s" : ""}`,
      href: "/admin/instructor-requests",
      count: pendingInstructorRequests ?? 0,
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Panel de Administración
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Resumen general de la organización
        </p>
      </div>

      {/* Attention banner — only shown when there are pending actions */}
      {attentionItems.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-300 mb-2.5">
                Requiere tu atención ({attentionItems.length} item
                {attentionItems.length !== 1 ? "s" : ""})
              </p>
              <ul className="space-y-1.5">
                {attentionItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 text-xs text-amber-400/80 hover:text-amber-300 transition-colors group"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                        {item.count}
                      </span>
                      {item.label}
                      <svg
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Practicantes totales"
          value={totalPractitioners ?? 0}
          color="text-primary-400"
        />
        <KpiCard
          label="Practicantes activos"
          value={activePractitioners ?? 0}
          color="text-emerald-400"
        />
        <KpiCard
          label="Academias activas"
          value={academies.length}
          color="text-amber-400"
          href="/admin/academies"
        />
        <KpiCard
          label="Próximos eventos"
          value={upcomingEvents.length}
          color="text-blue-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade distribution chart */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-50">
            Distribución por grado
          </h2>
          {gradeData.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-8">
              Sin datos de practicantes.
            </p>
          ) : (
            <GradeChart data={gradeData} />
          )}
        </section>

        {/* Upcoming events */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-50">
              Próximos eventos
            </h2>
            <Link
              href="/admin/events"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Gestionar →
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-8">
              No hay eventos próximos.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((event: UpcomingEvent) => {
                const days = daysUntil(event.event_date);
                return (
                  <li key={event.id} className="flex items-start gap-3">
                    <div className="shrink-0 text-center w-10">
                      <p className="text-lg font-bold text-neutral-50 leading-none">
                        {days === 0 ? "Hoy" : days}
                      </p>
                      {days > 0 && (
                        <p className="text-xs text-neutral-500">días</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200 truncate">
                        {event.name}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDate(event.event_date)}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs border ${EVENT_TYPE_STYLES[event.event_type] ?? "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                    >
                      {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Academies */}
      <section className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-700 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-50">
            Academias activas ({allAcademies.length})
            {regionFilter && (
              <span className="ml-2 text-xs text-neutral-500 font-normal">
                · {REGION_LABELS[regionFilter as ChileanRegion] ?? regionFilter}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Quick region filter */}
            <form method="GET" className="flex items-center gap-1">
              <select
                name="region"
                defaultValue={regionFilter}
                className="px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Todas las regiones</option>
                {Object.entries(REGION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-300 transition-colors"
              >
                Filtrar
              </button>
              {regionFilter && (
                <Link
                  href="/admin/dashboard"
                  className="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  ✕
                </Link>
              )}
            </form>
            <Link
              href="/admin/academies"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors whitespace-nowrap"
            >
              Ver todas →
            </Link>
          </div>
        </div>

        {academyCounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-sm">
              No hay academias registradas.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Academia
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  Región
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  Ciudad
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Alumnos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {academyCounts.map((academy) => (
                <tr
                  key={academy.id}
                  className="hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-5 py-3 text-neutral-100 font-medium">
                    <Link
                      href={`/admin/academies/${academy.id}`}
                      className="hover:text-primary-400 transition-colors"
                    >
                      {academy.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-400 hidden sm:table-cell">
                    {academy.region}
                  </td>
                  <td className="px-5 py-3 text-neutral-400 hidden sm:table-cell">
                    {academy.city}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-neutral-100 font-semibold tabular-nums">
                      {academy.practitionerCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const content = (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 hover:border-neutral-600 transition-colors">
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-3xl font-bold mt-2 tracking-tight ${color}`}>
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
