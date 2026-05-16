import type { InstructorAccountRequestListItem } from "./instructorAccountRequestListItem";
import { ApproveInstructorRequestButton } from "./ApproveInstructorRequestButton";
import { RejectInstructorRequestButton } from "./RejectInstructorRequestButton";
import { ObserveInstructorRequestButton } from "./ObserveInstructorRequestButton";

const STATUS_BADGE: Record<
  InstructorAccountRequestListItem["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-900/40 text-amber-300 border border-amber-700/40",
  },
  approved: {
    label: "Aprobado",
    className:
      "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-900/40 text-red-300 border border-red-700/40",
  },
  observed: {
    label: "Observado",
    className: "bg-blue-900/40 text-blue-300 border border-blue-700/40",
  },
};

const MESSAGE_MAX_LENGTH = 80;

function truncate(text: string | null, maxLength: number): string {
  if (!text) return "—";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

interface InstructorRequestsTableProps {
  requests: InstructorAccountRequestListItem[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function InstructorRequestsTable({
  requests,
  totalCount: _totalCount,
  page,
  totalPages,
}: InstructorRequestsTableProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500 text-sm">
        No hay solicitudes que coincidan con el filtro seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-neutral-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-700/60 bg-neutral-800/60">
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Nombre completo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                RUT
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Academia
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Mensaje
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700/40">
            {requests.map((req) => {
              const badge = STATUS_BADGE[req.status];
              return (
                <tr
                  key={req.id}
                  className="bg-neutral-900/40 hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-400">{req.email}</td>
                  <td className="px-4 py-3 text-neutral-200 font-medium">
                    {req.fullName}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 font-mono text-xs">
                    {req.rut}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {req.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {req.academyName ?? "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-neutral-500 text-xs max-w-[200px]"
                    title={req.message ?? undefined}
                  >
                    {truncate(req.message, MESSAGE_MAX_LENGTH)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {new Date(req.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3">
                    {req.status === "pending" && (
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <ApproveInstructorRequestButton requestId={req.id} />
                        <RejectInstructorRequestButton requestId={req.id} />
                        <ObserveInstructorRequestButton requestId={req.id} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-neutral-500">
            Página {page} de {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
