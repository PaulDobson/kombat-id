import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleMartialHistoryRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleMartialHistoryRepository";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateLong as formatDate } from "@/lib/format-date";

const PAGE_SIZE = 25;

const EVENT_TYPE_LABELS: Record<string, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  exam: "bg-success-900/50 text-success-400 border border-success-800",
};

function buildUrl(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) p.set(k, v);
  }
  const qs = p.toString();
  return `/martial-history${qs ? `?${qs}` : ""}`;
}

export default async function MartialHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const eventType =
    sp.type && ["competition", "seminar", "exam"].includes(sp.type)
      ? sp.type
      : undefined;

  const practitionerRepo = new DrizzlePractitionerRepository();
  const historyRepo = new DrizzleMartialHistoryRepository();

  const practitioner = await practitionerRepo.findByAuthUserId(user.id);
  if (!practitioner) notFound();

  const { entries, total } = await historyRepo.findPaginatedByPractitionerId(
    practitioner.id,
    {
      page,
      pageSize: PAGE_SIZE,
      ...(eventType ? { eventType } : {}),
    },
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Historial Marcial
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {total.toLocaleString("es-CL")} entrada{total !== 1 ? "s" : ""}
            {eventType && ` · filtrado por ${EVENT_TYPE_LABELS[eventType]}`}
          </p>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1">
          <Link
            href={buildUrl({})}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !eventType
                ? "bg-neutral-700 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Todos
          </Link>
          {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={buildUrl({ type: key })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                eventType === key
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center">
          <p className="text-neutral-500 text-sm">
            {eventType
              ? `No hay entradas de tipo "${EVENT_TYPE_LABELS[eventType]}" en el historial.`
              : "No hay entradas en el historial."}
          </p>
          {!eventType && (
            <p className="text-neutral-600 text-xs mt-1">
              Los administradores registran tus participaciones en eventos.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Resultado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Notas
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-neutral-300 tabular-nums whitespace-nowrap">
                      {formatDate(entry.eventDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[entry.eventType] ?? "bg-neutral-800 text-neutral-400"}`}
                      >
                        {EVENT_TYPE_LABELS[entry.eventType] ?? entry.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-300 hidden sm:table-cell">
                      {entry.result ?? (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs hidden md:table-cell max-w-xs truncate">
                      {entry.notes ?? (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.isCorrected ? (
                        <span className="bg-warning-500/10 text-warning-400 border border-warning-500/30 px-2 py-0.5 rounded-full text-xs">
                          Corregido
                        </span>
                      ) : (
                        <span className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                          Válido
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Página {page} de {totalPages} · {total.toLocaleString("es-CL")}{" "}
            registros
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={buildUrl({
                  page: String(page - 1),
                  type: eventType,
                })}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p2 = start + i;
              return (
                <Link
                  key={p2}
                  href={buildUrl({ page: String(p2), type: eventType })}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                    p2 === page
                      ? "bg-primary-600 border-primary-600 text-white"
                      : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
                  }`}
                >
                  {p2}
                </Link>
              );
            })}
            {page < totalPages && (
              <Link
                href={buildUrl({
                  page: String(page + 1),
                  type: eventType,
                })}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
