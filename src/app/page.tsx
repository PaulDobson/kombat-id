import Link from "next/link";
import { Search } from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";
import { PublicNav } from "@/app/_components/PublicNav";
import { formatDateShort } from "@/lib/format-date";
import type { EventType } from "@/types/database.types";
import {
  type RefereeListItem,
  toRefereeListItem,
} from "@/modules/referee-registration/presentation/components/refereeListItem";
import { RefereeGrid } from "@/modules/referee-registration/presentation/components/RefereeGrid";
import { listRefereeRegistrations } from "@/modules/referee-registration/application/use-cases/listRefereeRegistrations";
import { SupabaseRefereeRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository";

interface MartialEvent {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  location: string | null;
}

async function getUpcomingEvents(): Promise<MartialEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await adminSupabase
    .from("martial_events")
    .select("id, name, event_type, event_date, location")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(6);
  return (data as MartialEvent[]) ?? [];
}

async function getApprovedReferees(): Promise<RefereeListItem[]> {
  const repo = new SupabaseRefereeRegistrationRepository();
  const { items } = await listRefereeRegistrations(
    { status: "approved", pageSize: 200 },
    { repo },
  );
  return items.map(toRefereeListItem);
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<EventType, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  exam: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
};

const EVENT_TYPE_ACCENT_BG: Record<EventType, string> = {
  competition: "bg-primary-500",
  seminar: "bg-amber-500",
  exam: "bg-emerald-500",
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function formatDaysUntil(days: number): string {
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days < 0) return "Pasado";
  return `en ${days} días`;
}

const _HOW_IT_WORKS = [
  {
    step: "01",
    title: "Crea tu perfil",
    desc: "Regístrate con tu correo. Un administrador o instructor vincula tu cuenta a tu perfil oficial de practicante.",
  },
  {
    step: "02",
    title: "Acumula tu historial",
    desc: "Cada competencia, seminario y examen queda registrado. Tu historial marcial crece con cada evento.",
  },
  {
    step: "03",
    title: "Verifica y comparte",
    desc: "Descarga tus certificaciones digitales y comparte tu QR. Cualquiera puede verificar tu identidad al instante.",
  },
];

const _FEATURES = [
  {
    icon: "🪪",
    title: "Identidad digital",
    desc: "Perfil oficial con RUT, grado y QR de verificación instantánea.",
  },
  {
    icon: "📜",
    title: "Historial marcial",
    desc: "Registro permanente e inmutable de toda tu trayectoria.",
  },
  {
    icon: "🏆",
    title: "Ranking nacional",
    desc: "Posición en tiempo real por grado, edad y categoría de peso.",
  },
  {
    icon: "🎖️",
    title: "Certificaciones",
    desc: "Certificados digitales verificables con URL pública.",
  },
  {
    icon: "🏫",
    title: "Red de academias",
    desc: "Encuentra academias oficiales en las 16 regiones de Chile.",
  },
  {
    icon: "🔍",
    title: "Verificación online",
    desc: "Comprueba cualquier certificación o identidad en segundos.",
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const [upcoming, approvedReferees] = await Promise.all([
    getUpcomingEvents(),
    getApprovedReferees(),
  ]);
  const { search } = await searchParams;
  const searchQuery = search?.trim() || undefined;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 overflow-x-hidden">
      <PublicNav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-linear-to-br from-neutral-950 via-[#0a0a18] to-[#080810]"
          aria-hidden="true"
        />
        {/* Radial glow behind logo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary-600/8 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-600/6 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-6 w-full py-20 flex flex-col items-center gap-16">
          {/* ── Brand block — centered, logo-first ── */}
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Logo */}
            <div className="relative">
              <div
                className="absolute -inset-6 bg-primary-600/10 rounded-full blur-2xl"
                aria-hidden="true"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/KombatLogoSquare.webp"
                alt="Kombat Taekwondo"
                className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl shadow-2xl shadow-primary-900/60 ring-1 ring-primary-700/30"
              />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"
                aria-hidden="true"
              />
              Plataforma oficial · Kombat Taekwondo Chile
            </div>

            {/* Headline */}
            <div className="space-y-3 max-w-3xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none">
                Tu identidad
                <br />
                marcial,{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-400 via-indigo-400 to-primary-300">
                  verificable
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto">
                La plataforma que centraliza tu perfil, historial, ranking y
                certificaciones. Verificable por cualquier persona, en cualquier
                momento.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Historial marcial",
                "Ranking nacional",
                "Certificaciones QR",
                "Red de academias",
              ].map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 bg-neutral-800/60 border border-neutral-700 text-neutral-300 text-xs px-3 py-1.5 rounded-full"
                >
                  <span
                    className="w-1 h-1 rounded-full bg-primary-400"
                    aria-hidden="true"
                  />
                  {f}
                </span>
              ))}
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-900/50 hover:shadow-primary-900/70 hover:-translate-y-0.5"
              >
                Crear mi perfil gratis
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center justify-center gap-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-8 py-4 rounded-xl text-sm font-semibold transition-colors"
              >
                Verificar certificación →
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-neutral-950 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: c }}
                  >
                    {["JG", "MP", "CR", "AL"][i]}
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                Practicantes de todo Chile ya tienen su perfil digital
              </p>
            </div>
          </div>

          {/* ── Glass cards row — key value props ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
            {[
              {
                icon: "🪪",
                title: "Identidad verificable",
                desc: "Perfil oficial con QR único. Cualquiera puede verificar tu grado al instante.",
              },
              {
                icon: "📜",
                title: "Historial permanente",
                desc: "Cada competencia, examen y seminario queda registrado para siempre.",
              },
              {
                icon: "🏆",
                title: "Ranking nacional",
                desc: "Tu posición en tiempo real frente a practicantes de todo Chile.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group relative bg-neutral-900/60 backdrop-blur-sm border border-neutral-800 hover:border-primary-800/60 rounded-2xl p-6 space-y-3 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-900/20"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-900/40 border border-primary-800/40 flex items-center justify-center text-xl">
                  {card.icon}
                </div>
                <p className="text-sm font-semibold text-neutral-100">
                  {card.title}
                </p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ── Instructor CTA banner ── */}
          <div className="w-full max-w-4xl">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-linear-to-r from-indigo-950/60 to-primary-950/40 border border-indigo-800/30 rounded-2xl px-6 py-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-900/50 border border-indigo-700/40 flex items-center justify-center text-xl shrink-0">
                🏫
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-semibold text-neutral-200">
                  ¿Eres instructor o tienes una academia?
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Registra tu academia, gestiona tus alumnos y emite
                  certificaciones digitales.
                </p>
              </div>
              <Link
                href="/instructor-registration"
                className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-600/40 text-indigo-300 hover:text-indigo-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Solicitar acceso →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-32 bg-linear-to-t from-neutral-950 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <div className="border-y border-neutral-800/60 bg-neutral-900/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "16", label: "Regiones de Chile" },
            { value: "6", label: "Grados técnicos" },
            { value: "100%", label: "Verificación online" },
            { value: "24/7", label: "Disponibilidad" },
          ].map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="text-3xl sm:text-4xl font-bold text-primary-400 tracking-tight">
                {s.value}
              </p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Fondo radial sutil */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-225 h-150 rounded-full bg-primary-600/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-5xl mx-auto px-6">
          {/* Encabezado */}
          <div className="text-center mb-20 space-y-5">
            <div className="inline-flex items-center gap-2 bg-primary-900/30 border border-primary-700/40 text-primary-400 text-xs font-semibold px-4 py-2 rounded-full tracking-widest uppercase">
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"
                aria-hidden="true"
              />
              Proceso simple
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              ¿Cómo funciona?
            </h2>
            <p className="text-neutral-400 text-base max-w-md mx-auto leading-relaxed">
              Tres pasos para tener tu identidad marcial digital y verificable.
            </p>
          </div>

          {/* Grid de pasos */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {/* Conector horizontal con shimmer (solo desktop) */}
            <div
              className="hidden md:block absolute top-13 left-[calc(16.67%+3.5rem)] right-[calc(16.67%+3.5rem)] h-px overflow-hidden"
              aria-hidden="true"
            >
              <div className="h-full bg-linear-to-r from-primary-700/20 via-primary-500/50 to-primary-700/20" />
              <div className="absolute inset-0 w-1/3 bg-linear-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2.5s_ease-in-out_infinite]" />
            </div>

            {/* ── Paso 01 — Crea tu perfil ── */}
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div
                  className="absolute -inset-4 bg-primary-600/10 rounded-full blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative w-28 h-28 rounded-full bg-neutral-900 border-2 border-primary-600/50 flex items-center justify-center shadow-xl shadow-primary-950/60 ring-4 ring-primary-600/10">
                  <svg
                    className="w-9 h-9 text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                  <span className="absolute top-2.5 right-3 text-[10px] font-black text-primary-500/40 tabular-nums leading-none">
                    01
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-lg font-bold text-neutral-100">
                  Crea tu perfil
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-60 mx-auto">
                  Regístrate con tu correo. Un instructor vincula tu cuenta a tu
                  perfil oficial de practicante.
                </p>
              </div>

              {/* Mini mockup — tarjeta de perfil */}
              <div className="w-full bg-neutral-900/80 border border-neutral-800 hover:border-primary-800/40 rounded-2xl p-4 space-y-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-800/50 border border-primary-700/40 flex items-center justify-center text-primary-300 text-xs font-bold shrink-0">
                    KT
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-2.5 bg-neutral-700 rounded-full w-3/4" />
                    <div className="h-2 bg-neutral-800 rounded-full w-2/5" />
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-primary-900/60 border border-primary-800/50 text-primary-400 text-[10px] font-medium">
                    Cinturón Negro
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-medium">
                    Activo
                  </span>
                </div>
                <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-linear-to-r from-primary-600 to-primary-400 rounded-full" />
                </div>
              </div>
            </div>

            {/* ── Paso 02 — Acumula tu historial ── */}
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div
                  className="absolute -inset-4 bg-amber-600/10 rounded-full blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative w-28 h-28 rounded-full bg-neutral-900 border-2 border-amber-600/40 flex items-center justify-center shadow-xl shadow-amber-950/30 ring-4 ring-amber-600/10">
                  <svg
                    className="w-9 h-9 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <span className="absolute top-2.5 right-3 text-[10px] font-black text-amber-500/40 tabular-nums leading-none">
                    02
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-lg font-bold text-neutral-100">
                  Acumula tu historial
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-60 mx-auto">
                  Cada competencia, seminario y examen queda registrado. Tu
                  trayectoria crece con cada evento.
                </p>
              </div>

              {/* Mini mockup — timeline de eventos */}
              <div className="w-full bg-neutral-900/80 border border-neutral-800 hover:border-amber-800/30 rounded-2xl p-4 space-y-2.5 transition-colors">
                {(
                  [
                    {
                      label: "Campeonato Regional",
                      dot: "bg-primary-400",
                      badge: "Competencia",
                      cls: "bg-primary-900/60 border-primary-800/50 text-primary-400",
                    },
                    {
                      label: "Seminario Olímpico",
                      dot: "bg-amber-400",
                      badge: "Seminario",
                      cls: "bg-amber-900/40 border-amber-800/40 text-amber-400",
                    },
                    {
                      label: "Examen de Grado",
                      dot: "bg-emerald-400",
                      badge: "Examen",
                      cls: "bg-emerald-900/40 border-emerald-800/40 text-emerald-400",
                    },
                  ] as const
                ).map((ev) => (
                  <div key={ev.label} className="flex items-center gap-2.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${ev.dot} shrink-0`}
                    />
                    <p className="flex-1 text-[11px] text-neutral-300 truncate text-left">
                      {ev.label}
                    </p>
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-full border text-[9px] font-medium shrink-0 ${ev.cls}`}
                    >
                      {ev.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Paso 03 — Verifica y comparte ── */}
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div
                  className="absolute -inset-4 bg-emerald-600/10 rounded-full blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative w-28 h-28 rounded-full bg-neutral-900 border-2 border-emerald-600/40 flex items-center justify-center shadow-xl shadow-emerald-950/30 ring-4 ring-emerald-600/10">
                  <svg
                    className="w-9 h-9 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
                    />
                  </svg>
                  <span className="absolute top-2.5 right-3 text-[10px] font-black text-emerald-500/40 tabular-nums leading-none">
                    03
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-lg font-bold text-neutral-100">
                  Verifica y comparte
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-60 mx-auto">
                  Descarga tus certificaciones y comparte tu QR. Cualquiera
                  puede verificar tu identidad al instante.
                </p>
              </div>

              {/* Mini mockup — verificación QR */}
              <div className="w-full bg-neutral-900/80 border border-neutral-800 hover:border-emerald-800/30 rounded-2xl p-4 space-y-3 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-neutral-600 font-mono truncate">
                    kombat.cl/verify/qr/…
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                      aria-hidden="true"
                    />
                    Vigente
                  </span>
                </div>
                {/* QR decorativo */}
                <div className="mx-auto w-14 h-14 grid grid-cols-5 grid-rows-5 gap-0.5">
                  {[
                    1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1,
                    1, 1, 1, 1, 1,
                  ].map((fill, i) => (
                    <div
                      key={i}
                      className={`rounded-[2px] ${
                        fill ? "bg-emerald-400/70" : "bg-neutral-800"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1.5">
                  <span className="text-emerald-400 text-xs" aria-hidden="true">
                    ✓
                  </span>
                  <p className="text-[10px] text-emerald-400/80 font-medium">
                    Certificación vigente y válida
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────── */}
      <section className="border-y border-neutral-800 bg-neutral-900/20">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Columna izquierda: copy */}
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-medium px-3 py-1.5 rounded-full">
                Funcionalidades
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Todo lo que necesitas{" "}
                <span className="text-primary-400">en un solo lugar</span>
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-md">
                Una plataforma completa diseñada para practicantes, instructores
                y administradores de Kombat Taekwondo Chile.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
              >
                Comenzar ahora →
              </Link>
            </div>

            {/* Columna derecha: grid de características */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Identidad digital */}
              <div className="group flex items-start gap-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary-600/10 border border-primary-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100 mb-1">
                    Identidad digital
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Perfil oficial con RUT, grado y QR de verificación
                    instantánea.
                  </p>
                </div>
              </div>

              {/* Historial marcial */}
              <div className="group flex items-start gap-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-amber-600/10 border border-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100 mb-1">
                    Historial marcial
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Registro permanente e inmutable de toda tu trayectoria
                    competitiva.
                  </p>
                </div>
              </div>

              {/* Ranking nacional */}
              <div className="group flex items-start gap-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-rose-600/10 border border-rose-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-rose-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100 mb-1">
                    Ranking nacional
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Posición en tiempo real por grado, edad y categoría de peso.
                  </p>
                </div>
              </div>

              {/* Certificaciones */}
              <div className="group flex items-start gap-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-violet-600/10 border border-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-violet-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100 mb-1">
                    Certificaciones
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Certificados digitales verificables con URL pública y estado
                    en tiempo real.
                  </p>
                </div>
              </div>

              {/* Red de academias */}
              <div className="group flex items-start gap-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-sky-600/10 border border-sky-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-sky-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100 mb-1">
                    Red de academias
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Encuentra academias oficiales en las 16 regiones de Chile.
                  </p>
                </div>
              </div>

              {/* Verificación online */}
              <div className="group flex items-start gap-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/10 border border-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100 mb-1">
                    Verificación online
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Comprueba cualquier certificación o identidad en segundos,
                    sin cuenta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VERIFICACIÓN SPLIT ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Mock UI */}
          <div className="relative">
            <div
              className="absolute -inset-4 bg-emerald-600/5 rounded-3xl blur-2xl"
              aria-hidden="true"
            />
            <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser bar */}
              <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2 bg-neutral-900/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 mx-3 bg-neutral-800 rounded-md px-3 py-1 text-xs text-neutral-500 font-mono">
                  kombat.cl/verify/cert/…
                </div>
              </div>
              {/* Status */}
              <div className="px-5 py-4 bg-emerald-500/8 border-b border-emerald-500/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">
                    Certificación vigente y válida
                  </p>
                  <p className="text-xs text-emerald-400/60">
                    Verificado en tiempo real
                  </p>
                </div>
              </div>
              {/* Rows */}
              <div className="divide-y divide-neutral-800">
                {[
                  { label: "Practicante", value: "Carlos Rodríguez M." },
                  { label: "Tipo", value: "Grado Técnico — Cinturón Negro" },
                  { label: "Emitida", value: "15 mar 2025" },
                  { label: "Estado", value: "✅ Vigente" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <span className="text-xs text-neutral-500 uppercase tracking-wider shrink-0">
                      {row.label}
                    </span>
                    <span className="text-sm text-neutral-200 text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                aria-hidden="true"
              />
              Verificación en tiempo real
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Comprueba cualquier certificación al instante
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Árbitros, organizadores y empleadores pueden verificar la validez
              de una certificación o la identidad de un practicante en segundos,
              sin necesidad de crear una cuenta.
            </p>
            <ul className="space-y-3">
              {[
                "Sin registro requerido para verificar",
                "Resultado inmediato con estado vigente o revocado",
                "Verificación por ID de certificación o token QR",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-neutral-300"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-900/50 border border-emerald-800 flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/verify"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
              >
                Ir al verificador →
              </Link>
              <Link
                href="/academies"
                className="inline-flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                Ver academias
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRÓXIMOS EVENTOS ──────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section className="relative border-t border-neutral-800 overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-6 py-20 sm:py-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-widest">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"
                    aria-hidden="true"
                  />
                  Agenda oficial
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Próximas actividades
                </h2>
                <p className="text-sm text-neutral-400 max-w-lg">
                  Competencias, seminarios y exámenes oficiales. Inscríbete y sé
                  parte de la comunidad Kombat Taekwondo Chile.
                </p>
              </div>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-neutral-200 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0"
              >
                Ver todos los eventos
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>

            {/* Tarjetas de eventos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((event) => {
                const days = daysUntil(event.event_date);
                const daysLabel = formatDaysUntil(days);
                const urgencyClass =
                  days <= 3
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                    : days <= 14
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                      : "bg-neutral-800 text-neutral-400 border border-neutral-700";

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group relative flex flex-col bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-950/50"
                  >
                    {/* Barra de acento por tipo */}
                    <div
                      className={`h-0.5 w-full shrink-0 ${EVENT_TYPE_ACCENT_BG[event.event_type]}`}
                    />

                    <div className="flex flex-col gap-3 p-5 flex-1">
                      {/* Tipo + fecha */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type]}`}
                        >
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </span>
                        <time
                          dateTime={event.event_date}
                          className="text-xs text-neutral-500 shrink-0 mt-0.5"
                        >
                          {formatDateShort(event.event_date)}
                        </time>
                      </div>

                      {/* Nombre del evento */}
                      <p className="text-base font-bold text-neutral-100 leading-snug group-hover:text-white transition-colors">
                        {event.name}
                      </p>

                      {/* Ubicación */}
                      {event.location && (
                        <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 shrink-0 text-neutral-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                            />
                          </svg>
                          {event.location}
                        </p>
                      )}

                      <div className="flex-1 min-h-2" />

                      {/* Footer: countdown + CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyClass}`}
                        >
                          {daysLabel}
                        </span>
                        <span className="text-xs text-neutral-500 group-hover:text-primary-400 transition-colors flex items-center gap-1">
                          Ver evento
                          <svg
                            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── ÁRBITROS OFICIALES ───────────────────────────────────────────── */}
      <section className="border-t border-neutral-800 bg-neutral-900/20">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-widest">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  aria-hidden="true"
                />
                Directorio oficial
              </span>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Árbitros Oficiales
                </h2>
                <span className="text-sm font-medium text-neutral-400 bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 rounded-full">
                  {approvedReferees.length}{" "}
                  {approvedReferees.length === 1 ? "árbitro" : "árbitros"}
                </span>
              </div>
              <p className="text-sm text-neutral-400 max-w-lg">
                Árbitros certificados y activos de Kombat Taekwondo Chile,
                verificados por la organización.
              </p>
            </div>
            <Link
              href="/referees"
              className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-neutral-200 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0"
            >
              Ver directorio completo
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>

          {/* Buscador */}
          <form method="GET" className="mb-8">
            <div className="relative max-w-md">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                size={14}
              />
              <input
                type="search"
                name="search"
                defaultValue={searchQuery ?? ""}
                placeholder="Buscar árbitro por nombre..."
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800/60 pl-9 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors"
              />
            </div>
          </form>

          <RefereeGrid
            referees={approvedReferees}
            {...(searchQuery !== undefined && { searchQuery })}
          />
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-neutral-800">
        <div
          className="absolute inset-0 bg-linear-to-br from-primary-950/40 via-neutral-950 to-neutral-950"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-600/8 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl mx-auto px-6 py-24 sm:py-32 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              ¿Listo para digitalizar
              <br />
              tu identidad marcial?
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-xl mx-auto">
              Únete a la plataforma oficial de Kombat Taekwondo Chile. Crea tu
              perfil, accede a tu historial y comparte tus certificaciones con
              el mundo.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-900/50 hover:shadow-primary-900/70 hover:-translate-y-0.5"
            >
              Crear mi perfil gratuito
            </Link>
            <Link
              href="/academies"
              className="w-full sm:w-auto hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 px-8 py-4 rounded-xl text-sm transition-colors"
            >
              Ver academias →
            </Link>
            <Link
              href="/referee-registration"
              className="w-full sm:w-auto hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 px-8 py-4 rounded-xl text-sm transition-colors"
            >
              Regístrate como árbitro →
            </Link>
            <Link
              href="/instructor-registration"
              className="w-full sm:w-auto hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 px-8 py-4 rounded-xl text-sm transition-colors"
            >
              Solicitar cuenta de instructor →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-600">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/KombatLogoSquare.webp"
                alt="Kombat Taekwondo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-neutral-500 font-medium">
              Kombat Taekwondo Chile
            </span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Footer">
            <Link
              href="/referees"
              className="hover:text-neutral-400 transition-colors"
            >
              Árbitros
            </Link>
            <Link
              href="/instructor-registration"
              className="hover:text-neutral-400 transition-colors"
            >
              Instructores
            </Link>
            <Link
              href="/academies"
              className="hover:text-neutral-400 transition-colors"
            >
              Academias
            </Link>
            <Link
              href="/verify"
              className="hover:text-neutral-400 transition-colors"
            >
              Verificar
            </Link>
            <Link
              href="/login"
              className="hover:text-neutral-400 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="hover:text-neutral-400 transition-colors"
            >
              Registrarse
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} Kombat Taekwondo Chile</p>
        </div>
      </footer>
    </div>
  );
}
