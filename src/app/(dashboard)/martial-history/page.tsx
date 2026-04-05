import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleMartialHistoryRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleMartialHistoryRepository";
import { notFound } from "next/navigation";

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

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function MartialHistoryPage() {
  const user = await requireUser();
  const practitionerRepo = new DrizzlePractitionerRepository();
  const historyRepo = new DrizzleMartialHistoryRepository();

  const practitioner = await practitionerRepo.findByAuthUserId(user.id);
  if (!practitioner) notFound();

  const entries = await historyRepo.findByPractitionerId(practitioner.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Historial Marcial
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {entries.length} entrada{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center">
          <p className="text-neutral-500 text-sm">
            No hay entradas en el historial.
          </p>
          <p className="text-neutral-600 text-xs mt-1">
            Los administradores registran tus participaciones en eventos.
          </p>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
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
                    {entry.notes ?? <span className="text-neutral-600">—</span>}
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
      )}
    </main>
  );
}
