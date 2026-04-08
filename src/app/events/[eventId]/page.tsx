import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { EventType } from "@/types/database.types";

// Página pública — sin autenticación requerida
// Si el usuario es admin, se muestran controles de edición

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

import { formatDateWithWeekday as formatDate } from "@/lib/format-date";

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const today = new Date().toISOString().slice(0, 10);

  const [isAdmin] = await Promise.all([getAdminStatus()]);

  const { data: event } = (await adminSupabase
    .from("martial_events")
    .select("id, name, event_type, event_date, location, created_at")
    .eq("id", eventId)
    .maybeSingle()) as unknown as {
    data: {
      id: string;
      name: string;
      event_type: string;
      event_date: string;
      location: string | null;
      created_at: string;
    } | null;
  };

  if (!event) notFound();

  // Participantes registrados — solo datos públicos (sin RUT ni datos de contacto)
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

  // Fetch nombres públicos de practicantes
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
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/events"
        className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        ← Volver a eventos
      </Link>

      {/* Admin actions bar */}
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

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type as EventType]}`}
          >
            {EVENT_TYPE_LABELS[event.event_type as EventType]}
          </span>
          {isInternational && (
            <span className="bg-blue-900/50 text-blue-400 border border-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
              Internacional
            </span>
          )}
          {isPast ? (
            <span className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs">
              Pasado
            </span>
          ) : (
            <span className="bg-success-900/50 text-success-400 border border-success-800 px-2.5 py-0.5 rounded-full text-xs">
              Próximo
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-neutral-50 tracking-tight">
          {event.name}
        </h1>
      </div>

      {/* Detalles */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">
          Detalles del evento
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Fecha
            </dt>
            <dd className="text-neutral-200 capitalize">
              {formatDate(event.event_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Lugar
            </dt>
            <dd className="text-neutral-200">
              {event.location ?? (
                <span className="text-neutral-600">Sin especificar</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Participantes
            </dt>
            <dd className="text-neutral-200">{participants.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Tipo
            </dt>
            <dd className="text-neutral-200">
              {EVENT_TYPE_LABELS[event.event_type as EventType]}
              {isInternational && " · Internacional"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Participantes */}
      {participants.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-700">
            <h2 className="text-sm font-semibold text-neutral-50">
              Participantes registrados
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Practicante
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  Grado
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Resultado
                </th>
                {isInternational && (
                  <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
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
                  <td className="px-6 py-3 text-neutral-100 font-medium">
                    {p.practitioner?.fullName ?? (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-neutral-400 capitalize hidden sm:table-cell">
                    {p.practitioner?.grade ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    {p.result ? (
                      <span className="text-neutral-200">
                        {RESULT_LABELS[p.result] ?? p.result}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  {isInternational && (
                    <td className="px-6 py-3 text-neutral-400 hidden md:table-cell">
                      {p.eventCountry ?? "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {participants.length === 0 && isPast && (
        <p className="text-neutral-500 text-sm text-center py-8">
          No hay participantes registrados para este evento.
        </p>
      )}

      {!isPast && (
        <p className="text-neutral-500 text-sm text-center py-4">
          Los participantes se registrarán una vez que el evento haya concluido.
        </p>
      )}
    </main>
  );
}
