import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleMartialHistoryRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleMartialHistoryRepository";
import { DrizzleRankingRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleRankingRepository";
import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import Link from "next/link";

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_COLORS: Record<string, string> = {
  white: "bg-neutral-200",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-900 border border-neutral-600",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

import { formatDateShort as formatDate } from "@/lib/format-date";

export default async function DashboardPage() {
  const user = await requireUser();

  const practitionerRepo = new DrizzlePractitionerRepository();
  const practitioner = await practitionerRepo.findByAuthUserId(user.id);

  // If no practitioner profile yet, show a welcome screen
  if (!practitioner) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 mb-2">
          <span className="text-white font-bold text-2xl" aria-hidden="true">
            KT
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
          Bienvenido a Kombat Taekwondo
        </h1>
        <p className="text-neutral-400 text-sm leading-relaxed">
          Tu cuenta está activa pero aún no tienes un perfil de practicante
          asociado. Contacta a un administrador para que registre tu perfil.
        </p>
        <p className="text-xs text-neutral-600">{user.email}</p>
      </main>
    );
  }

  // Fetch all data in parallel
  const historyRepo = new DrizzleMartialHistoryRepository();
  const rankingRepo = new DrizzleRankingRepository();
  const certRepo = new DrizzleCertificationRepository();

  const [historyEntries, ranking, certifications, upcomingEvents] =
    await Promise.all([
      historyRepo.findByPractitionerId(practitioner.id),
      rankingRepo.findByPractitioner(practitioner.id),
      certRepo.findByPractitioner(practitioner.id),
      adminSupabase
        .from("martial_events")
        .select("id, name, event_type, event_date, location")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date", { ascending: true })
        .limit(3)
        .then(({ data }) => data ?? []),
    ]);

  const activeCerts = certifications.filter((c) => !c.isRevoked);
  const recentHistory = historyEntries.slice(0, 3);
  const gradeLabel = `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}`;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── HERO CARD ─────────────────────────────────────────────── */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Belt color indicator */}
        <div
          className={`w-14 h-14 rounded-full shrink-0 flex items-center justify-center ${GRADE_COLORS[practitioner.grade]}`}
        >
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            {practitioner.grade === "black"
              ? "DAN"
              : practitioner.grade.slice(0, 3).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-neutral-50 tracking-tight">
              {practitioner.fullName}
            </h1>
            {practitioner.isActive ? (
              <span className="bg-success-900/50 text-success-400 border border-success-800 px-2 py-0.5 rounded-full text-xs">
                Activo
              </span>
            ) : (
              <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                Inactivo
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-400 mt-0.5">
            {gradeLabel} · Desde {formatDate(practitioner.startDate)}
          </p>
          {practitioner.role && (
            <p className="text-xs text-neutral-500 mt-0.5 capitalize">
              {practitioner.role}
            </p>
          )}
        </div>

        <Link
          href="/profile"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          Ver perfil
        </Link>
      </div>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Eventos"
          value={historyEntries.length}
          href="/martial-history"
          color="text-primary-400"
        />
        <StatCard
          label="Certificaciones"
          value={activeCerts.length}
          href="/certifications"
          color="text-success-400"
        />
        <StatCard
          label="Posición ranking"
          value={ranking ? `#${ranking.position}` : "—"}
          href="/ranking"
          color="text-warning-400"
        />
        <StatCard
          label="Puntos"
          value={ranking?.totalPoints ?? 0}
          href="/ranking"
          color="text-info-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── HISTORIAL RECIENTE ──────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-50">
              Historial reciente
            </h2>
            <Link
              href="/martial-history"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Ver todo →
            </Link>
          </div>

          {recentHistory.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-6">
              Sin entradas en el historial.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentHistory.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-200">
                      {EVENT_TYPE_LABELS[entry.eventType] ?? entry.eventType}
                      {entry.result && (
                        <span className="text-neutral-400">
                          {" "}
                          · {entry.result}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(entry.eventDate)}
                    </p>
                  </div>
                  {entry.isCorrected && (
                    <span className="text-xs text-warning-400 shrink-0">
                      Corregido
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── PRÓXIMOS EVENTOS ────────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-50">
              Próximos eventos
            </h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-6">
              No hay eventos próximos.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning-400 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-200">{event.name}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(event.event_date)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500 shrink-0 capitalize">
                    {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── CERTIFICACIONES ─────────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-50">
              Certificaciones
            </h2>
            <Link
              href="/certifications"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Ver todas →
            </Link>
          </div>

          {activeCerts.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-6">
              Sin certificaciones activas.
            </p>
          ) : (
            <ul className="space-y-3">
              {activeCerts.slice(0, 3).map((cert) => (
                <li key={cert.id} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-success-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-200 capitalize">
                      {cert.certType.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(cert.issuedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── RANKING ─────────────────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-50">
              Mi ranking
            </h2>
            <Link
              href="/ranking"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Ver detalle →
            </Link>
          </div>

          {!ranking ? (
            <p className="text-neutral-500 text-sm text-center py-6">
              Sin datos de ranking.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-warning-400 tracking-tight">
                  #{ranking.position}
                </span>
                <span className="text-sm text-neutral-400 mb-1">
                  de {ranking.categoryCount} practicantes
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-warning-400 rounded-full transition-all"
                  style={{
                    width: `${Math.max(5, 100 - ((ranking.position - 1) / ranking.categoryCount) * 100)}%`,
                  }}
                />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Puntos</dt>
                  <dd className="text-neutral-200 font-medium">
                    {ranking.totalPoints}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Categoría</dt>
                  <dd className="text-neutral-200 font-medium capitalize">
                    {ranking.ageRange}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  href,
  color,
}: {
  label: string;
  value: string | number;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-xl p-5 transition-colors group"
    >
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-3xl font-bold mt-2 tracking-tight ${color}`}>
        {value}
      </p>
    </Link>
  );
}
