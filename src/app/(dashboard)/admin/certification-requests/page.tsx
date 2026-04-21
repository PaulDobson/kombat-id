import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ApproveRequestButton } from "./ApproveRequestButton";
import { RejectRequestButton } from "./RejectRequestButton";
import { ObserveRequestButton } from "./ObserveRequestButton";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/dashboard");
  return user;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const CERT_TYPE_LABELS: Record<string, string> = {
  technical_grade: "Grado técnico",
  instructor: "Instructor",
  referee: "Árbitro",
  coach: "Entrenador",
  event_participation: "Participación en evento",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  return `/admin/certification-requests${qs ? `?${qs}` : ""}`;
}

import { formatDateShort as formatDate } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CertificationRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminUser();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Fetch pending requests with pagination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requestRows, count } = await (adminSupabase as any)
    .from("certification_requests")
    .select("*", { count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const requests = (requestRows ?? []) as Array<{
    id: string;
    requester_id: string;
    practitioner_id: string;
    cert_type: string;
    notes: string | null;
    status: string;
    created_at: string;
  }>;

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Enrich with practitioner names (scoped to current page)
  const practitionerIds = [
    ...new Set([
      ...requests.map((r) => r.requester_id),
      ...requests.map((r) => r.practitioner_id),
    ]),
  ];

  const { data: practitionerRows } =
    practitionerIds.length > 0
      ? await adminSupabase
          .from("practitioners")
          .select("id, full_name, rut")
          .in("id", practitionerIds)
      : { data: [] };

  const practitionerById = new Map<string, { fullName: string; rut: string }>();
  for (const p of practitionerRows ?? []) {
    practitionerById.set(p.id as string, {
      fullName: p.full_name as string,
      rut: p.rut as string,
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Solicitudes de certificación
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          {totalCount.toLocaleString("es-CL")} solicitudes pendientes
        </p>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              No hay solicitudes pendientes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Notas
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {requests.map((req) => {
                  const requester = practitionerById.get(req.requester_id);
                  const target = practitionerById.get(req.practitioner_id);
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-neutral-100 font-medium text-sm">
                          {requester?.fullName ?? (
                            <span className="text-neutral-500">—</span>
                          )}
                        </p>
                        {requester?.rut && (
                          <p className="text-xs text-neutral-500 tabular-nums">
                            {requester.rut}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-neutral-100 font-medium text-sm">
                          {target?.fullName ?? (
                            <span className="text-neutral-500">—</span>
                          )}
                        </p>
                        {target?.rut && (
                          <p className="text-xs text-neutral-500 tabular-nums">
                            {target.rut}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-primary-900/50 text-primary-400 border border-primary-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          {CERT_TYPE_LABELS[req.cert_type] ?? req.cert_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-xs max-w-xs hidden lg:table-cell">
                        {req.notes ? (
                          <span className="line-clamp-2">{req.notes}</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-xs tabular-nums hidden sm:table-cell">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ApproveRequestButton requestId={req.id} />
                          <RejectRequestButton requestId={req.id} />
                          <ObserveRequestButton requestId={req.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Página {page} de {totalPages} · {totalCount.toLocaleString("es-CL")}{" "}
            registros
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={buildUrl({}, { page: String(page - 1) })}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p2 = start + i;
              return (
                <Link
                  key={p2}
                  href={buildUrl({}, { page: String(p2) })}
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
                href={buildUrl({}, { page: String(page + 1) })}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
