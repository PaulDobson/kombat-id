import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/admin";
import type { EventType } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Data fetching — upcoming / recent martial events (public)
// ---------------------------------------------------------------------------

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

async function getRecentEvents(): Promise<MartialEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await adminSupabase
    .from("martial_events")
    .select("id, name, event_type, event_date, location")
    .lt("event_date", today)
    .order("event_date", { ascending: false })
    .limit(3);
  return (data as MartialEvent[]) ?? [];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<EventType, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  exam: "bg-success-900/50 text-success-400 border border-success-800",
};

const EVENT_TYPE_ICONS: Record<EventType, string> = {
  competition: "🥋",
  seminar: "📚",
  exam: "🎓",
};

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EventCard({ event }: { event: MartialEvent }) {
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 flex flex-col gap-3 hover:border-neutral-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type]}`}
        >
          <span aria-hidden="true">{EVENT_TYPE_ICONS[event.event_type]}</span>
          {EVENT_TYPE_LABELS[event.event_type]}
        </span>
        <time
          dateTime={event.event_date}
          className="text-xs text-neutral-500 shrink-0"
        >
          {formatDate(event.event_date)}
        </time>
      </div>
      <p className="text-sm font-medium text-neutral-100 leading-snug">
        {event.name}
      </p>
      {event.location && (
        <p className="text-xs text-neutral-500 flex items-center gap-1">
          <span aria-hidden="true">📍</span>
          {event.location}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LandingPage() {
  const [upcoming, recent] = await Promise.all([
    getUpcomingEvents(),
    getRecentEvents(),
  ]);

  const hasEvents = upcoming.length > 0 || recent.length > 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs" aria-hidden="true">
                KT
              </span>
            </div>
            <span className="font-semibold text-neutral-50 tracking-tight">
              Kombat Taekwondo Chile
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/academies"
              className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors hidden sm:block"
            >
              Academias
            </Link>
            <Link
              href="/login"
              className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span aria-hidden="true">🥋</span>
            Identidad Digital Oficial
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-50 max-w-3xl mx-auto leading-tight">
            Tu identidad marcial,{" "}
            <span className="text-primary-400">verificable</span> y permanente
          </h1>
          <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            La plataforma oficial de Kombat Taekwondo Chile que centraliza tu
            perfil, historial marcial, ranking y certificaciones en un solo
            lugar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Crear mi perfil
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        {/* ── SERVICIOS ─────────────────────────────────────────────────── */}
        <section className="bg-neutral-900/50 border-y border-neutral-800 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-50">
                Todo lo que necesitas en un solo lugar
              </h2>
              <p className="text-sm text-neutral-400 mt-2">
                Gestiona tu trayectoria marcial de forma digital y verificable
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICES.map((service) => (
                <div
                  key={service.title}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-xl"
                    aria-hidden="true"
                  >
                    {service.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-100">
                    {service.title}
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── NOTICIAS / EVENTOS ────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-16 sm:py-20">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-50">
                Actividades y noticias
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
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

          {!hasEvents ? (
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center">
              <p className="text-neutral-500 text-sm">
                No hay actividades publicadas por el momento.
              </p>
              <p className="text-neutral-600 text-xs mt-1">
                Vuelve pronto para ver las próximas novedades.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {upcoming.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
                    Próximas actividades
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcoming.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              )}

              {recent.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
                    Actividades recientes
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recent.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── CTA FINAL ─────────────────────────────────────────────────── */}
        <section className="bg-neutral-900/50 border-t border-neutral-800 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto px-6 text-center space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-50">
              ¿Eres practicante de Kombat Taekwondo?
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Crea tu perfil digital, accede a tu historial marcial, consulta tu
              ranking y descarga tus certificaciones oficiales.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                Crear mi perfil gratuito
              </Link>
              <Link
                href="/academies"
                className="w-full sm:w-auto hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 px-6 py-3 rounded-lg text-sm transition-colors"
              >
                Ver academias →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-[9px]">KT</span>
            </div>
            <span>Kombat Taekwondo Chile</span>
          </div>
          <nav className="flex items-center gap-4" aria-label="Footer">
            <Link
              href="/academies"
              className="hover:text-neutral-400 transition-colors"
            >
              Academias
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
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    icon: "🪪",
    title: "Identidad digital única",
    description:
      "Cada practicante tiene un perfil oficial con RUT, grado, foto y código QR de verificación instantánea.",
  },
  {
    icon: "📜",
    title: "Historial marcial inmutable",
    description:
      "Registro permanente de competencias, seminarios y exámenes. Tu trayectoria queda guardada para siempre.",
  },
  {
    icon: "🏆",
    title: "Ranking por categoría",
    description:
      "Consulta tu posición en el ranking nacional según tu grado, edad y categoría de peso.",
  },
  {
    icon: "🎖️",
    title: "Certificaciones digitales",
    description:
      "Recibe certificados oficiales verificables con URL pública. Grados técnicos, instructor, árbitro y más.",
  },
  {
    icon: "📱",
    title: "Verificación por QR",
    description:
      "Árbitros e instructores pueden verificar tu identidad y grado en segundos escaneando tu código QR.",
  },
  {
    icon: "🏫",
    title: "Red de academias",
    description:
      "Encuentra academias oficiales en todo Chile y conoce a los instructores responsables de cada una.",
  },
];
