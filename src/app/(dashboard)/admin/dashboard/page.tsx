import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import Link from "next/link";
import { GradeChart } from "./GradeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MartialEvent {
  id: string;
  name: string;
  event_type: string;
  event_date: string;
  location: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  exam: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
};

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

export default async function AdminDashboardPage() {
  const user = await requireUser();

  // Verify admin
  const { data: adminData } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminData) redirect("/dashboard");

  const academyRepo = new DrizzleAcademyRepository();

  const today = new Date().toISOString().slice(0, 10);

  const [
    academies,
    { data: practitioners },
    { data: upcomingEvents },
    { count: totalPractitioners },
    { count: activePractitioners },
  ] = await Promise.all([
    academyRepo.findAllActive(),
    adminSupabase.from("practitioners").select("id, grade, is_active"),
    adminSupabase
      .from("martial_events")
      .select("id, name, event_type, event_date, location")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(5),
    adminSupabase
      .from("practitioners")
      .select("id", { count: "exact", head: true }),
    adminSupabase
      .from("practitioners")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  for (const p of practitioners ?? []) {
    const g = p.grade as string;
    gradeCounts[g] = (gradeCounts[g] ?? 0) + 1;
  }
  const gradeData = Object.entries(gradeCounts).map(([grade, count]) => ({
    grade,
    label: GRADE_LABELS[grade] ?? grade,
    count,
  }));

  // Academy practitioner counts
  const academyCounts = await Promise.all(
    academies.map(async (a) => ({
      ...a,
      practitionerCount: await academyRepo.countActivePractitioners(a.id),
    })),
  );

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
          value={(upcomingEvents ?? []).length}
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

          {(upcomingEvents ?? []).length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-8">
              No hay eventos próximos.
            </p>
          ) : (
            <ul className="space-y-3">
              {(upcomingEvents as MartialEvent[]).map((event) => {
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
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-50">
            Academias activas ({academies.length})
          </h2>
          <Link
            href="/admin/academies"
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Ver todas →
          </Link>
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
