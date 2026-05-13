import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { EventType, EventAttachment } from "@/types/database.types";
import { formatDateWithWeekday, formatDateLong } from "@/lib/format-date";
import { ShareButton } from "./ShareButton";
import { ArrowLeft } from "lucide-react";

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

const RESULT_LABELS: Record<string, string> = {
  "1st": "🥇 1er lugar",
  "2nd": "🥈 2do lugar",
  "3rd": "🥉 3er lugar",
  participant: "Participante",
  passed: "Aprobado",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const today = new Date().toISOString().slice(0, 10);

  const isAdmin = await getAdminStatus();

  const { data: event } = (await adminSupabase
    .from("martial_events")
    .select(
      "id, name, event_type, event_date, location, created_at, description, cover_image_path, registration_fee, min_participants, max_participants, attachments",
    )
    .eq("id", eventId)
    .maybeSingle()) as unknown as {
    data: {
      id: string;
      name: string;
      event_type: string;
      event_date: string;
      location: string | null;
      created_at: string;
      description: string | null;
      cover_image_path: string | null;
      registration_fee: number | null;
      min_participants: number | null;
      max_participants: number | null;
      attachments: EventAttachment[] | null;
    } | null;
  };

  if (!event) notFound();

  // Signed URL for cover image
  let coverUrl: string | null = null;
  if (event.cover_image_path) {
    const { data } = await adminSupabase.storage
      .from("event-files")
      .createSignedUrl(event.cover_image_path, 3600);
    coverUrl = data?.signedUrl ?? null;
  }

  // Signed URLs for attachments
  const attachments: (EventAttachment & { signedUrl: string })[] = [];
  for (const att of event.attachments ?? []) {
    const { data } = await adminSupabase.storage
      .from("event-files")
      .createSignedUrl(att.path, 3600);
    if (data?.signedUrl) {
      attachments.push({ ...att, signedUrl: data.signedUrl });
    }
  }

  // Participants
  const { data: historyRows } = (await adminSupabase
    .from("martial_history")
    .select("id, result, notes, event_scope, event_country, practitioner_id")
    .eq("event_id", eventId)
    .eq("is_corrected", false)) as unknown as {
    data:
      | {
          id: string;
          result: string | null;
          notes: string | null;
          event_scope: string | null;
          event_country: string | null;
          practitioner_id: string;
        }[]
      | null;
  };

  const participantIds = (historyRows ?? []).map((h) => h.practitioner_id);
  const practitionerMap: Record<string, { fullName: string; grade: string }> =
    {};

  if (participantIds.length > 0) {
    const { data: practitioners } = (await adminSupabase
      .from("practitioners")
      .select("id, full_name, grade")
      .in("id", participantIds)) as unknown as {
      data: { id: string; full_name: string; grade: string }[] | null;
    };
    for (const p of practitioners ?? []) {
      practitionerMap[p.id] = { fullName: p.full_name, grade: p.grade };
    }
  }

  const participants = (historyRows ?? []).map((h) => ({
    id: h.id,
    result: h.result as string | null,
    notes: h.notes as string | null,
    eventScope: h.event_scope as string | null,
    eventCountry: h.event_country as string | null,
    practitioner: practitionerMap[h.practitioner_id] ?? null,
  }));

  const isPast = event.event_date < today;
  const isInternational = participants.some(
    (p) => p.eventScope === "international",
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      {/* Breadcrumb + admin bar */}
      <div className="max-w-4xl mx-auto px-6 pt-6 space-y-3">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a eventos
        </Link>

        {isAdmin && (
          <div className="flex items-center justify-between bg-primary-900/20 border border-primary-800/50 rounded-xl px-4 py-3">
            <span className="text-xs text-primary-400 font-medium">
              Vista de administrador
            </span>
            <div className="flex gap-2">
              <Link
                href={`/admin/events/${eventId}`}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Panel admin
              </Link>
              <Link
                href={`/admin/events/${eventId}/edit`}
                className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Editar evento
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="mt-6 w-full">
        {coverUrl ? (
          <>
            {/* Image — full width, natural proportions, no crop */}
            <div className="w-full bg-neutral-950 flex items-center justify-center relative max-h-[70vh]">
              <Image
                src={coverUrl}
                alt={event.name}
                width={1200}
                height={800}
                className="w-full max-h-[70vh] object-contain"
                priority
              />
            </div>
            {/* Hero text below the image */}
            <div className="bg-linear-to-b from-neutral-950 to-neutral-950 border-b border-neutral-800/60">
              <HeroContent event={event} isPast={isPast} eventId={eventId} />
            </div>
          </>
        ) : (
          /* No image — gradient hero with glow orbs */
          <div className="relative w-full min-h-[320px] overflow-hidden bg-linear-to-br from-neutral-950 via-[#0d0d1a] to-[#0a0a1f]">
            <div
              className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-primary-600/12 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <HeroContent event={event} isPast={isPast} eventId={eventId} />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {event.description && (
              <section>
                <h2 className="text-lg font-semibold text-neutral-50 mb-3">
                  Sobre este evento
                </h2>
                <p className="text-neutral-400 leading-relaxed text-sm whitespace-pre-line">
                  {event.description}
                </p>
              </section>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-neutral-50 mb-3">
                  Documentos
                </h2>
                <ul className="space-y-2">
                  {attachments.map((att) => (
                    <li key={att.path}>
                      <a
                        href={att.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 transition-colors group"
                      >
                        <span className="text-xl" aria-hidden="true">
                          📄
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-200 group-hover:text-neutral-50 truncate">
                            {att.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatFileSize(att.size)}
                          </p>
                        </div>
                        <span className="text-xs text-primary-400 shrink-0">
                          Descargar ↓
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Participants table */}
            {participants.length > 0 && (
              <section id="participantes">
                <h2 className="text-lg font-semibold text-neutral-50 mb-3">
                  Participantes registrados
                </h2>
                <div className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Practicante
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                          Grado
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Resultado
                        </th>
                        {isInternational && (
                          <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                            País
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {participants.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-neutral-800/40 transition-colors"
                        >
                          <td className="px-5 py-3 text-neutral-100 font-medium">
                            {p.practitioner?.fullName ?? (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-neutral-400 capitalize hidden sm:table-cell">
                            {p.practitioner?.grade ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            {p.result ? (
                              <span className="text-neutral-200">
                                {RESULT_LABELS[p.result] ?? p.result}
                              </span>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>
                          {isInternational && (
                            <td className="px-5 py-3 text-neutral-400 hidden md:table-cell">
                              {p.eventCountry ?? "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {participants.length === 0 && isPast && (
              <p className="text-neutral-500 text-sm text-center py-8">
                No hay participantes registrados para este evento.
              </p>
            )}

            {!isPast && participants.length === 0 && (
              <p className="text-neutral-500 text-sm text-center py-4">
                Los participantes se registrarán una vez que el evento haya
                concluido.
              </p>
            )}
          </div>

          {/* Right column — sticky card */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-5">
              {/* Price */}
              <div>
                {event.registration_fee == null ? (
                  <p className="text-2xl font-bold text-success-400">
                    Entrada libre
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-neutral-50">
                    {formatCLP(event.registration_fee)}
                  </p>
                )}
              </div>

              <div className="border-t border-neutral-800" />

              {/* Details */}
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                    Fecha
                  </dt>
                  <dd className="text-neutral-200 capitalize">
                    {formatDateWithWeekday(event.event_date)}
                  </dd>
                </div>
                {event.location && (
                  <div>
                    <dt className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                      Lugar
                    </dt>
                    <dd className="text-neutral-200">{event.location}</dd>
                  </div>
                )}
                {event.max_participants != null && (
                  <div>
                    <dt className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                      Aforo
                    </dt>
                    <dd className="text-neutral-200">
                      {event.max_participants} cupos disponibles
                    </dd>
                  </div>
                )}
              </dl>

              <div className="border-t border-neutral-800" />

              {/* CTA */}
              {isPast ? (
                <a
                  href="#participantes"
                  className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
                >
                  Ver resultados
                </a>
              ) : (
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all shadow-lg shadow-primary-900/40 hover:-translate-y-0.5"
                >
                  Inscribirse →
                </Link>
              )}

              <div className="border-t border-neutral-800" />

              {/* Share */}
              <ShareButton />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// Hero text block — used both with and without cover image
function HeroContent({
  event,
  isPast,
}: {
  event: {
    name: string;
    event_type: string;
    event_date: string;
    location: string | null;
  };
  isPast: boolean;
  eventId: string;
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type as EventType]}`}
        >
          {EVENT_TYPE_LABELS[event.event_type as EventType]}
        </span>
        {isPast ? (
          <span className="bg-neutral-800/80 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs">
            Pasado
          </span>
        ) : (
          <span className="bg-success-900/70 text-success-400 border border-success-800 px-2.5 py-0.5 rounded-full text-xs">
            Próximo
          </span>
        )}
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold text-neutral-50 tracking-tight leading-tight">
        {event.name}
      </h1>

      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">📅</span>
          <span className="capitalize">{formatDateLong(event.event_date)}</span>
        </span>
        {event.location && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">📍</span>
            {event.location}
          </span>
        )}
      </div>

      {!isPast && (
        <div className="pt-1">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-900/50 hover:-translate-y-0.5"
          >
            Inscribirse →
          </Link>
        </div>
      )}
    </div>
  );
}
