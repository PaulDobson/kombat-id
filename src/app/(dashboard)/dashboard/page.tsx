import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleMartialHistoryRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleMartialHistoryRepository";
import { DrizzleRankingRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleRankingRepository";
import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import { getUpcomingEvents } from "@/modules/event-registration/infrastructure/repositories/upcomingEventsQuery";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Trophy,
  Award,
  Calendar,
  Activity,
  ChevronRight,
  Swords,
  BookOpen,
  GraduationCap,
  Zap,
  Medal,
  QrCode,
  MapPin,
  CheckCircle,
  User,
} from "lucide-react";
import { formatDateShort as formatDate } from "@/lib/format-date";

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_META: Record<
  string,
  { tailwindBg: string; tailwindText: string; hex: string }
> = {
  white: {
    tailwindBg: "bg-neutral-300",
    tailwindText: "text-neutral-900",
    hex: "#d4d4d4",
  },
  yellow: {
    tailwindBg: "bg-yellow-400",
    tailwindText: "text-yellow-900",
    hex: "#facc15",
  },
  green: {
    tailwindBg: "bg-emerald-500",
    tailwindText: "text-white",
    hex: "#10b981",
  },
  blue: {
    tailwindBg: "bg-blue-500",
    tailwindText: "text-white",
    hex: "#3b82f6",
  },
  red: {
    tailwindBg: "bg-red-500",
    tailwindText: "text-white",
    hex: "#ef4444",
  },
  black: {
    tailwindBg: "bg-neutral-800 ring-2 ring-neutral-600",
    tailwindText: "text-neutral-300",
    hex: "#737373",
  },
};

const ROLE_LABELS: Record<string, string> = {
  alumno: "Alumno",
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
};

const EVENT_DISPLAY: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  competition: {
    label: "Competencia",
    icon: Swords,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  seminar: {
    label: "Seminario",
    icon: BookOpen,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  exam: {
    label: "Examen",
    icon: GraduationCap,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
};

const CERT_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  technical_grade: {
    label: "Grado técnico",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  instructor: {
    label: "Instructor",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  referee: {
    label: "Árbitro",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
  coach: {
    label: "Entrenador",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  event_participation: {
    label: "Participación",
    color: "text-neutral-300",
    bg: "bg-neutral-700/30",
    border: "border-neutral-600/50",
  },
};

export default async function DashboardPage() {
  const user = await requireUser();

  const practitionerRepo = new DrizzlePractitionerRepository();
  const practitioner = await practitionerRepo.findByAuthUserId(user.id);

  // If no practitioner profile yet, show a clear pending state
  if (!practitioner) {
    return (
      <main className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 mb-2">
          <User className="w-8 h-8 text-neutral-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-neutral-50 tracking-tight">
            Perfil pendiente de activación
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Tu cuenta está activa. Tu instructor debe registrar tu ficha técnica
            para que puedas acceder a tu identidad digital, QR y perfil marcial.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 text-left space-y-3">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Próximos pasos
          </p>
          <ol className="space-y-2">
            {[
              "Tu instructor ingresa tu ficha técnica al sistema",
              "El sistema genera tu ID Kombat y QR personal",
              "Vuelve aquí — tu perfil estará disponible",
            ].map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-neutral-300"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center text-xs text-neutral-500 font-medium mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-neutral-600">Cuenta: {user.email}</p>
      </main>
    );
  }

  // Fetch all data in parallel — métodos optimizados con count + limit en una sola consulta
  const historyRepo = new DrizzleMartialHistoryRepository();
  const rankingRepo = new DrizzleRankingRepository();
  const certRepo = new DrizzleCertificationRepository();

  const [
    { entries: recentHistory, total: historyTotal },
    ranking,
    { certs: recentCerts, totalActive: certsTotal },
    upcomingEvents,
  ] = await Promise.all([
    historyRepo.findRecentWithTotal(practitioner.id, 3),
    rankingRepo.findByPractitioner(practitioner.id),
    certRepo.findActiveSummary(practitioner.id, 3),
    getUpcomingEvents(3),
  ]);

  const gradeLabel = `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}`;
  const gradeMeta = GRADE_META[practitioner.grade] ?? GRADE_META["white"]!;
  const kombatId = `KT-${practitioner.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const yearsTraining = Math.floor(
    (Date.now() - new Date(practitioner.startDate).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── HERO CARD ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-neutral-900 border border-neutral-700 border-l-4 rounded-2xl p-6"
        style={{ borderLeftColor: gradeMeta.hex }}
      >
        {/* Glow sutil basado en color de cinturón */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            background: `radial-gradient(ellipse at 0% 0%, ${gradeMeta.hex}, transparent 60%)`,
          }}
        />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Badge de cinturón */}
          <div
            className={`w-16 h-16 rounded-full shrink-0 ${gradeMeta.tailwindBg} flex items-center justify-center shadow-lg`}
          >
            <span
              className={`text-xs font-bold ${gradeMeta.tailwindText} uppercase tracking-wider`}
            >
              {practitioner.grade === "black"
                ? practitioner.dan
                  ? `${practitioner.dan}D`
                  : "DAN"
                : practitioner.grade.slice(0, 3).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-neutral-50 tracking-tight">
                {practitioner.fullName}
              </h1>
              {practitioner.isActive ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                  Inactivo
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-neutral-200">
              {gradeLabel}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-2">
              {practitioner.role && (
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                  <User className="w-3.5 h-3.5" />
                  {ROLE_LABELS[practitioner.role] ?? practitioner.role}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                <Activity className="w-3.5 h-3.5" />
                {yearsTraining > 0
                  ? `${yearsTraining} año${yearsTraining !== 1 ? "s" : ""} de práctica`
                  : "Menos de 1 año"}
              </span>
              <span className="text-xs text-neutral-600 font-mono">
                {kombatId}
              </span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <User className="w-4 h-4" />
              Perfil
            </Link>
            <Link
              href="/profile#qr"
              className="inline-flex items-center gap-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/25 hover:border-primary-500/40 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Mi QR
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Eventos"
          value={historyTotal}
          href="/martial-history"
          icon={Activity}
          color="text-primary-400"
          iconBg="bg-primary-400/10"
        />
        <StatCard
          label="Certificaciones"
          value={certsTotal}
          href="/certifications"
          icon={Award}
          color="text-emerald-400"
          iconBg="bg-emerald-400/10"
        />
        <StatCard
          label="Posición"
          value={ranking ? `#${ranking.position}` : "—"}
          href="/ranking"
          icon={Medal}
          color="text-yellow-400"
          iconBg="bg-yellow-400/10"
        />
        <StatCard
          label="Puntos"
          value={ranking?.totalPoints ?? 0}
          href="/ranking"
          icon={Zap}
          color="text-purple-400"
          iconBg="bg-purple-400/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── HISTORIAL RECIENTE ──────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-400/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary-400" />
              </div>
              <h2 className="text-sm font-semibold text-neutral-50">
                Historial reciente
              </h2>
            </div>
            <Link
              href="/martial-history"
              className="inline-flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Ver todo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2.5">
              <Activity className="w-8 h-8 text-neutral-700" />
              <p className="text-neutral-500 text-sm">
                Sin entradas en el historial
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recentHistory.map((entry) => {
                const disp = EVENT_DISPLAY[entry.eventType] ?? {
                  label: entry.eventType,
                  icon: Activity,
                  color: "text-neutral-400",
                  bg: "bg-neutral-700/30",
                  border: "border-neutral-600/50",
                };
                const Icon = disp.icon;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/40"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${disp.bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${disp.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-200 font-medium">
                        {disp.label}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(entry.eventDate)}
                        {entry.result && ` · ${entry.result}`}
                      </p>
                    </div>
                    {entry.isCorrected && (
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full shrink-0">
                        Corregido
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── PRÓXIMOS EVENTOS ────────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-yellow-400" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-50">
              Próximos eventos
            </h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2.5">
              <Calendar className="w-8 h-8 text-neutral-700" />
              <p className="text-neutral-500 text-sm">
                No hay eventos próximos
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {upcomingEvents.map((event) => {
                const dateObj = new Date(event.event_date + "T00:00:00");
                const day = dateObj.getDate().toString().padStart(2, "0");
                const month = dateObj.toLocaleDateString("es-CL", {
                  month: "short",
                });
                const disp = EVENT_DISPLAY[event.event_type];
                return (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/40 hover:bg-neutral-800 hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 shrink-0">
                        <span className="text-sm font-bold text-yellow-400 leading-none">
                          {day}
                        </span>
                        <span className="text-[10px] text-yellow-500/70 uppercase leading-none mt-0.5">
                          {month}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-neutral-200 font-medium truncate">
                          {event.name}
                        </p>
                        {event.location && (
                          <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      {disp && (
                        <span
                          className={`text-xs ${disp.color} ${disp.bg} ${disp.border} border px-2 py-0.5 rounded-full shrink-0`}
                        >
                          {disp.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── CERTIFICACIONES ─────────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-neutral-50">
                Certificaciones
              </h2>
            </div>
            <Link
              href="/certifications"
              className="inline-flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentCerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2.5">
              <Award className="w-8 h-8 text-neutral-700" />
              <p className="text-neutral-500 text-sm">
                Sin certificaciones activas
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recentCerts.map((cert) => {
                const meta = CERT_META[cert.certType] ?? {
                  label: cert.certType.replace(/_/g, " "),
                  color: "text-neutral-300",
                  bg: "bg-neutral-700/30",
                  border: "border-neutral-600/50",
                };
                return (
                  <li
                    key={cert.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/40"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}
                    >
                      <CheckCircle className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${meta.color}`}>
                        {meta.label}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(cert.issuedAt)}
                      </p>
                    </div>
                    <span
                      className={`text-xs ${meta.color} ${meta.bg} ${meta.border} border px-2 py-0.5 rounded-full shrink-0`}
                    >
                      Activa
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── RANKING ─────────────────────────────────────────────── */}
        <section className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <h2 className="text-sm font-semibold text-neutral-50">
                Mi ranking
              </h2>
            </div>
            <Link
              href="/ranking"
              className="inline-flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Ver detalle <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!ranking ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2.5">
              <Trophy className="w-8 h-8 text-neutral-700" />
              <p className="text-neutral-500 text-sm">Sin datos de ranking</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl font-black text-yellow-400 tracking-tighter leading-none">
                  #{ranking.position}
                </span>
                <div>
                  <p className="text-xs text-neutral-400">
                    de {ranking.categoryCount} practicantes
                  </p>
                  <p className="text-xs text-neutral-500 capitalize mt-0.5">
                    {ranking.ageRange}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Posición en categoría</span>
                  <span className="text-neutral-400 font-medium">
                    {Math.round(
                      (1 - (ranking.position - 1) / ranking.categoryCount) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-yellow-500 to-yellow-400 rounded-full"
                    style={{
                      width: `${Math.max(5, 100 - ((ranking.position - 1) / ranking.categoryCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-yellow-400/5 border border-yellow-400/15">
                <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-yellow-400">
                    {ranking.totalPoints}
                  </span>
                  <span className="text-xs text-neutral-500">
                    puntos acumulados
                  </span>
                </div>
              </div>
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
  icon: Icon,
  color,
  iconBg,
}: {
  label: string;
  value: string | number;
  href: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
}) {
  return (
    <Link
      href={href}
      className="relative bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-2xl p-5 transition-colors group overflow-hidden"
    >
      <div
        className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}
      >
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="text-xs text-neutral-400 mt-0.5 font-medium">{label}</p>
      <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
    </Link>
  );
}
