import { adminSupabase } from "@/lib/supabase/admin";
import Link from "next/link";
import { formatDateShort } from "@/lib/format-date";
import {
  CERT_TYPE_LABELS,
  CERT_REQUEST_STATUS_LABELS,
  CERT_REQUEST_STATUS_STYLES,
} from "@/lib/presentation-constants";
import { RequestCertificationForm } from "../RequestCertificationForm";

const REQ_PAGE_SIZE = 10;

function buildUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/instructor${qs ? `?${qs}` : ""}`;
}

interface Props {
  practitionerId: string;
  reqPage: number;
  currentPage?: string | undefined;
  academyMemberIds: string[];
}

export async function CertificationRequestSection({
  practitionerId,
  reqPage,
  currentPage,
  academyMemberIds,
}: Props) {
  const reqOffset = (reqPage - 1) * REQ_PAGE_SIZE;

  // Fetch active students for the certification form
  const { data: allActiveStudentRows } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, rut")
    .eq("role", "alumno")
    .eq("is_active", true)
    .in(
      "id",
      academyMemberIds.length > 0
        ? academyMemberIds
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("full_name")
    .limit(500);

  const activeStudentsForForm = (allActiveStudentRows ?? []).map(
    (s: { id: string; full_name: string; rut: string }) => ({
      id: s.id,
      fullName: s.full_name,
      rut: s.rut,
    }),
  );

  // Fetch paginated certification requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requestRows, count: reqCount } = await (adminSupabase as any)
    .from("certification_requests")
    .select(
      "id, cert_type, status, rejection_reason, observation_notes, created_at, practitioners!practitioner_id(full_name, rut)",
      { count: "exact" },
    )
    .eq("requester_id", practitionerId)
    .order("created_at", { ascending: false })
    .range(reqOffset, reqOffset + REQ_PAGE_SIZE - 1);

  const certRequests = (requestRows ?? []) as Array<{
    id: string;
    cert_type: string;
    status: string;
    rejection_reason: string | null;
    observation_notes: string | null;
    created_at: string;
    practitioners: { full_name: string; rut: string } | null;
  }>;
  const reqTotalCount = reqCount ?? 0;
  const reqTotalPages = Math.ceil(reqTotalCount / REQ_PAGE_SIZE);

  return (
    <>
      {/* Section C: Solicitar certificación */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">
            Solicitar certificación
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Envía una solicitud al administrador para emitir una certificación a
            uno de tus alumnos.
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-lg">
          <RequestCertificationForm students={activeStudentsForForm} />
        </div>
      </section>

      {/* Section D: Mis solicitudes */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">
            Mis solicitudes
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {reqTotalCount.toLocaleString("es-CL")} solicitudes enviadas
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          {certRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-neutral-500 text-sm">
                Aún no has enviado solicitudes de certificación.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900/80">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Alumno
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {certRequests.map((r) => {
                    const label =
                      CERT_REQUEST_STATUS_LABELS[r.status] ?? r.status;
                    const badgeCls =
                      CERT_REQUEST_STATUS_STYLES[r.status] ??
                      "bg-neutral-800 text-neutral-400 border-neutral-700";
                    const reason =
                      r.status === "rejected"
                        ? r.rejection_reason
                        : r.status === "observed"
                          ? r.observation_notes
                          : null;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-neutral-100 font-medium">
                          {r.practitioners?.full_name ?? (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs hidden sm:table-cell">
                          {CERT_TYPE_LABELS[r.cert_type] ?? r.cert_type}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden md:table-cell">
                          {formatDateShort(r.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${badgeCls}`}
                          >
                            {label}
                          </span>
                          {reason && (
                            <p className="mt-1 text-xs text-neutral-400 max-w-xs">
                              {reason}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {reqTotalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Página {reqPage} de {reqTotalPages} ·{" "}
              {reqTotalCount.toLocaleString("es-CL")} solicitudes
            </p>
            <div className="flex items-center gap-1">
              {reqPage > 1 && (
                <Link
                  href={buildUrl(
                    { page: currentPage },
                    { reqPage: String(reqPage - 1) },
                  )}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              {Array.from({ length: Math.min(5, reqTotalPages) }, (_, i) => {
                const start = Math.max(
                  1,
                  Math.min(reqPage - 2, reqTotalPages - 4),
                );
                const p2 = start + i;
                return (
                  <Link
                    key={p2}
                    href={buildUrl(
                      { page: currentPage },
                      { reqPage: String(p2) },
                    )}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${p2 === reqPage ? "bg-primary-600 border-primary-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"}`}
                  >
                    {p2}
                  </Link>
                );
              })}
              {reqPage < reqTotalPages && (
                <Link
                  href={buildUrl(
                    { page: currentPage },
                    { reqPage: String(reqPage + 1) },
                  )}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
