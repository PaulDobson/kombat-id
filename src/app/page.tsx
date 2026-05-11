import Link from "next/link";
import { Search } from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";
import { PublicNav } from "@/app/_components/PublicNav";
import { HeroCarousel } from "@/app/_components/HeroCarousel";
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

const HOW_IT_WORKS = [
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

const FEATURES = [
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
        {/* Deep background gradient — inspired by reference */}
        <div
          className="absolute inset-0 bg-linear-to-br from-neutral-950 via-[#0d0d1a] to-[#0a0a1f]"
          aria-hidden="true"
        />
        {/* Glow orbs */}
        <div
          className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-primary-600/12 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-6 w-full py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="space-y-8 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"
                aria-hidden="true"
              />
              Plataforma oficial · Kombat Taekwondo Chile
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
                Tu identidad
                <br />
                marcial,{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-400 via-indigo-400 to-primary-300">
                  verificable
                </span>
              </h1>
              <p className="text-lg text-neutral-400 leading-relaxed max-w-lg">
                La plataforma que centraliza tu perfil, historial, ranking y
                certificaciones. Verificable por cualquier persona, en cualquier
                momento.
              </p>
            </div>

            {/* Mini feature pills */}
            <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-7 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-900/50 hover:shadow-primary-900/70 hover:-translate-y-0.5"
              >
                Crear mi perfil gratis
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center justify-center gap-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Verificar certificación →
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 pt-2">
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

          {/* Right — carousel */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <div className="relative w-full max-w-sm">
              {/* Card glow border */}
              <div
                className="absolute -inset-0.5 bg-linear-to-br from-primary-600/40 to-indigo-600/20 rounded-3xl blur-sm"
                aria-hidden="true"
              />
              <div className="relative bg-neutral-900/90 border border-neutral-700/60 rounded-3xl p-6 h-[420px] backdrop-blur-sm">
                <HeroCarousel />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-24 bg-linear-to-t from-neutral-950 to-transparent pointer-events-none"
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
      <section className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <div className="text-center mb-16 space-y-3">
          <span className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-medium px-3 py-1.5 rounded-full">
            Proceso simple
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            ¿Cómo funciona?
          </h2>
          <p className="text-neutral-400 text-sm max-w-md mx-auto">
            Tres pasos para tener tu identidad marcial digital y verificable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-linear-to-r from-transparent via-primary-700/50 to-transparent"
            aria-hidden="true"
          />

          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.step}
              className="relative bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-7 space-y-4 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-neutral-800 group-hover:text-primary-900/60 transition-colors tabular-nums">
                  {step.step}
                </span>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-neutral-950 border border-neutral-700 rounded-full items-center justify-center z-10">
                    <span className="text-neutral-500 text-xs">→</span>
                  </div>
                )}
              </div>
              <h3 className="text-base font-semibold text-neutral-100">
                {step.title}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────── */}
      <section className="border-y border-neutral-800 bg-neutral-900/20">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-medium px-3 py-1.5 rounded-full">
                Funcionalidades
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Todo lo que necesitas en un solo lugar
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-primary-900/50 rounded-xl p-5 space-y-2.5 transition-all hover:-translate-y-0.5"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {f.icon}
                  </span>
                  <p className="text-sm font-semibold text-neutral-100">
                    {f.title}
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
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
        <section className="border-t border-neutral-800 bg-neutral-900/20">
          <div className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-medium px-3 py-1.5 rounded-full">
                  Agenda
                </span>
                <h2 className="text-3xl font-bold tracking-tight">
                  Próximas actividades
                </h2>
                <p className="text-sm text-neutral-400">
                  Competencias, seminarios y exámenes de la organización
                </p>
              </div>
              <Link
                href="/login"
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors shrink-0"
              >
                Ver todos →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 space-y-3 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${EVENT_TYPE_STYLES[event.event_type]}`}
                    >
                      {EVENT_TYPE_LABELS[event.event_type]}
                    </span>
                    <time
                      dateTime={event.event_date}
                      className="text-xs text-neutral-500 shrink-0"
                    >
                      {formatDateShort(event.event_date)}
                    </time>
                  </div>
                  <p className="text-sm font-semibold text-neutral-100 leading-snug">
                    {event.name}
                  </p>
                  {event.location && (
                    <p className="text-xs text-neutral-500 flex items-center gap-1">
                      <span aria-hidden="true">📍</span>
                      {event.location}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── ÁRBITROS OFICIALES ───────────────────────────────────────────── */}
      <section className="border-t border-neutral-800 bg-neutral-900/20">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-medium px-3 py-1.5 rounded-full">
                Directorio
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                Árbitros Oficiales
              </h2>
              <p className="text-sm text-neutral-400">
                Árbitros certificados de Kombat Taekwondo Chile
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm text-neutral-500">
                {approvedReferees.length}{" "}
                {approvedReferees.length === 1 ? "árbitro" : "árbitros"}
              </span>
              <Link
                href="/referees"
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Ver todos →
              </Link>
            </div>
          </div>
          <form method="GET" className="mb-8">
            <div className="relative max-w-sm">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                size={14}
              />
              <input
                type="search"
                name="search"
                defaultValue={searchQuery ?? ""}
                placeholder="Buscar por nombre..."
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800/60 pl-9 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
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
