import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { EventType } from "@/types/database.types";
import {
  CalendarDays,
  MapPin,
  Users,
  Banknote,
  Swords,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Trophy,
  Star,
} from "lucide-react";
import { formatDateWithWeekday } from "@/lib/format-date";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MartialEvent {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  location: string | null;
  description: string | null;
  cover_image_path: string | null;
  registration_fee: number | null;
  max_participants: number | null;
}

// ─── Event type config ────────────────────────────────────────────────────────

const EVENT_TYPE_META: Record<
  EventType,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    gradient: string;
    pill: string;
    filterBg: string;
  }
> = {
  competition: {
    label: "Competencia",
    icon: Swords,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    gradient: "from-rose-950/80 via-neutral-950 to-neutral-950",
    pill: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    filterBg:
      "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20",
  },
  seminar: {
    label: "Seminario / Camp",
    icon: BookOpen,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    gradient: "from-amber-950/80 via-neutral-950 to-neutral-950",
    pill: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    filterBg:
      "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20",
  },
  exam: {
    label: "Examen / Capacitación",
    icon: GraduationCap,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    gradient: "from-emerald-950/80 via-neutral-950 to-neutral-950",
    pill: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    filterBg:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventMeta(type: string): (typeof EVENT_TYPE_META)[EventType] {
  return (EVENT_TYPE_META[type as EventType] ?? EVENT_TYPE_META.seminar)!;
}

function getCoverUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = adminSupabase.storage.from("event-files").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function formatFee(fee: number | null): string {
  if (fee === null || fee === 0) return "Entrada libre";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(fee);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

async function getAdminStatus(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await adminSupabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const isAdmin = await getAdminStatus();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("martial_events")
    .select(
      "id, name, event_type, event_date, location, description, cover_image_path, registration_fee, max_participants",
    )
    .order("event_date", { ascending: true });

  const activeType =
    params.type && ["competition", "seminar", "exam"].includes(params.type)
      ? (params.type as EventType)
      : null;

  if (activeType) query = query.eq("event_type", activeType);
  if (params.q) query = query.ilike("name", `%${params.q}%`);

  const { data: events } = await query;
  const eventList: MartialEvent[] = events ?? [];

  const upcoming = eventList.filter((e) => e.event_date >= today);
  const past = eventList.filter((e) => e.event_date < today).reverse();

  // Featured = next upcoming event (any type)
  const allUpcoming = activeType
    ? eventList.filter((e) => e.event_date >= today)
    : (events ?? []).filter((e: MartialEvent) => e.event_date >= today);

  const featured: MartialEvent | null =
    !params.q && !activeType && allUpcoming.length > 0 ? allUpcoming[0] : null;

  const totalUpcoming = (events ?? []).filter(
    (e: MartialEvent) => e.event_date >= today,
  ).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-neutral-800/60">
        {/* Background glow */}
        <div
          className="absolute inset-0 bg-linear-to-br from-primary-950/40 via-neutral-950 to-neutral-950"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-primary-600/8 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-6"
          >
            ← Volver al inicio
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-semibold px-3 py-1.5 rounded-full tracking-widest uppercase">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"
                  aria-hidden="true"
                />
                Calendario oficial 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                Eventos
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-400 via-indigo-300 to-primary-400">
                  Kombat Taekwondo
                </span>
              </h1>
              <p className="text-neutral-400 text-base leading-relaxed">
                Competencias, seminarios, campamentos y capacitaciones oficiales
                de la federación nacional. Mantente al día y no te pierdas
                ningún evento.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 shrink-0">
              <div className="text-center bg-neutral-900/60 border border-neutral-800 rounded-2xl px-5 py-4">
                <p className="text-3xl font-black text-primary-400">
                  {totalUpcoming}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Próximos</p>
              </div>
              <div className="text-center bg-neutral-900/60 border border-neutral-800 rounded-2xl px-5 py-4">
                <p className="text-3xl font-black text-neutral-200">
                  {eventList.length}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Total 2026</p>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-6">
              <Link
                href="/admin/events"
                className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Gestionar eventos →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── EVENT TYPE PILLS (filter) ────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <form method="GET" className="contents">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            <button
              type="submit"
              name="type"
              value=""
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                !activeType
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Todos
            </button>
            {(
              Object.entries(EVENT_TYPE_META) as [
                EventType,
                (typeof EVENT_TYPE_META)[EventType],
              ][]
            ).map(([type, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  type="submit"
                  name="type"
                  value={type}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    activeType === type
                      ? `${meta.bg} ${meta.color} ${meta.border}`
                      : "bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </form>

          {/* Search inline */}
          <form method="GET" className="ml-auto flex items-center gap-2">
            {activeType && (
              <input type="hidden" name="type" value={activeType} />
            )}
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Buscar evento..."
              className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-full text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
            />
            {(params.q || params.type) && (
              <Link
                href="/events"
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2"
              >
                ✕ Limpiar
              </Link>
            )}
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-12">
        {eventList.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <CalendarDays className="w-12 h-12 text-neutral-700 mx-auto" />
            <p className="text-neutral-500 text-sm">
              No se encontraron eventos.
            </p>
            <Link
              href="/events"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Ver todos los eventos →
            </Link>
          </div>
        ) : (
          <>
            {/* ── FEATURED EVENT ──────────────────────────────────── */}
            {featured && <FeaturedEvent event={featured} today={today} />}

            {/* ── PRÓXIMOS EVENTOS ────────────────────────────────── */}
            {upcoming.length > 0 && (
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-primary-500 rounded-full" />
                  <h2 className="text-lg font-bold text-neutral-100">
                    Próximos eventos
                  </h2>
                  <span className="bg-primary-500/15 text-primary-400 border border-primary-500/25 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {upcoming.length}
                  </span>
                </div>
                <EventGrid
                  events={featured ? upcoming.slice(1) : upcoming}
                  today={today}
                />
              </section>
            )}

            {/* ── EVENTOS PASADOS ─────────────────────────────────── */}
            {past.length > 0 && (
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-neutral-600 rounded-full" />
                  <h2 className="text-lg font-bold text-neutral-400">
                    Historial de eventos
                  </h2>
                  <span className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {past.length}
                  </span>
                </div>
                <EventGrid events={past} today={today} muted />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Featured Event ───────────────────────────────────────────────────────────

function FeaturedEvent({
  event,
  today: _today,
}: {
  event: MartialEvent;
  today: string;
}) {
  const meta = getEventMeta(event.event_type);
  const Icon = meta.icon;
  const coverUrl = getCoverUrl(event.cover_image_path);
  const days = daysUntil(event.event_date);
  const fee = formatFee(event.registration_fee);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-yellow-400 rounded-full" />
        <h2 className="text-lg font-bold text-neutral-100">
          Próximo evento destacado
        </h2>
        <span className="inline-flex items-center gap-1 bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 px-2.5 py-0.5 rounded-full text-xs font-semibold">
          <Trophy className="w-3 h-3" />
          Destacado
        </span>
      </div>

      <Link
        href={`/events/${event.id}`}
        className="group block relative overflow-hidden rounded-2xl border border-neutral-700 hover:border-neutral-500 transition-all"
      >
        {/* Background: cover image or gradient */}
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-linear-to-br ${meta.gradient} opacity-60`}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/80 to-transparent"
          aria-hidden="true"
        />

        <div className="relative p-8 sm:p-10 flex flex-col sm:flex-row gap-8">
          {/* Left: info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${meta.pill}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
              </span>
              {days <= 7 && days >= 0 && (
                <span className="inline-flex items-center gap-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  ¡
                  {days === 0
                    ? "Hoy!"
                    : days === 1
                      ? "Mañana!"
                      : `En ${days} días!`}
                </span>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-neutral-50 group-hover:text-primary-300 transition-colors leading-tight">
              {event.name}
            </h3>

            {event.description && (
              <p className="text-sm text-neutral-400 leading-relaxed max-w-xl line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-neutral-300">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-neutral-500 shrink-0" />
                <span className="capitalize">
                  {formatDateWithWeekday(event.event_date)}
                </span>
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                  {event.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-neutral-500 shrink-0" />
                <span
                  className={
                    fee === "Entrada libre"
                      ? "text-emerald-400 font-semibold"
                      : "text-neutral-300"
                  }
                >
                  {fee}
                </span>
              </span>
              {event.max_participants && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-neutral-500 shrink-0" />
                  Cupos limitados: {event.max_participants}
                </span>
              )}
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 shrink-0">
            <div className="text-center sm:text-right">
              {days >= 0 && (
                <p className={`text-4xl font-black tabular-nums ${meta.color}`}>
                  {days === 0 ? "HOY" : `${days}`}
                </p>
              )}
              {days > 0 && (
                <p className="text-xs text-neutral-500">días restantes</p>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 bg-primary-600 group-hover:bg-primary-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap">
              Ver detalle <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

// ─── Event Grid ───────────────────────────────────────────────────────────────

function EventGrid({
  events,
  today,
  muted = false,
}: {
  events: MartialEvent[];
  today: string;
  muted?: boolean;
}) {
  if (events.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {events.map((event) => (
        <EventCard key={event.id} event={event} today={today} muted={muted} />
      ))}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  today,
  muted,
}: {
  event: MartialEvent;
  today: string;
  muted: boolean;
}) {
  const meta = getEventMeta(event.event_type);
  const Icon = meta.icon;
  const isPast = event.event_date < today;
  const coverUrl = getCoverUrl(event.cover_image_path);
  const fee = formatFee(event.registration_fee);
  const days = !isPast ? daysUntil(event.event_date) : null;

  // Date display: day + month as a visual calendar chip
  const dateObj = new Date(event.event_date + "T00:00:00");
  const dayNum = dateObj.getDate().toString().padStart(2, "0");
  const monthStr = dateObj.toLocaleDateString("es-CL", { month: "short" });

  return (
    <Link
      href={`/events/${event.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all ${
        isPast || muted
          ? "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 opacity-70 hover:opacity-90"
          : "border-neutral-700 bg-neutral-900 hover:border-neutral-500 hover:shadow-lg hover:shadow-neutral-950/50 hover:-translate-y-0.5"
      }`}
    >
      {/* Cover image area */}
      <div className="relative h-40 overflow-hidden bg-neutral-800">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`w-full h-full bg-linear-to-br ${meta.gradient} flex items-center justify-center`}
          >
            <Icon className={`w-12 h-12 ${meta.color} opacity-40`} />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-linear-to-t from-neutral-900/90 to-transparent" />

        {/* Date chip */}
        <div className="absolute bottom-3 left-3 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-neutral-950/80 border border-neutral-700/60 backdrop-blur-sm">
          <span
            className={`text-lg font-black leading-none ${isPast ? "text-neutral-400" : meta.color}`}
          >
            {dayNum}
          </span>
          <span className="text-[10px] text-neutral-500 uppercase leading-none mt-0.5">
            {monthStr}
          </span>
        </div>

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm ${meta.pill}`}
          >
            <Icon className="w-3 h-3" />
            {meta.label}
          </span>
        </div>

        {/* Urgency badge */}
        {days !== null && days <= 7 && days >= 0 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center bg-rose-500/90 text-white px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
              {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days}d`}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        <h3
          className={`text-base font-bold leading-snug transition-colors group-hover:text-primary-300 ${isPast ? "text-neutral-400" : "text-neutral-50"}`}
        >
          {event.name}
        </h3>

        {event.description && !isPast && (
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="mt-auto space-y-1.5 pt-3 border-t border-neutral-800">
          {event.location && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-400">
              <MapPin className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs">
              <Banknote className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <span
                className={
                  fee === "Entrada libre"
                    ? "text-emerald-400 font-semibold"
                    : "text-neutral-400"
                }
              >
                {fee}
              </span>
            </p>
            <span
              className={`text-xs font-medium transition-colors group-hover:gap-2 flex items-center gap-1 ${isPast ? "text-neutral-600" : "text-primary-400 group-hover:text-primary-300"}`}
            >
              {isPast ? "Ver resumen" : "Ver detalle"}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
