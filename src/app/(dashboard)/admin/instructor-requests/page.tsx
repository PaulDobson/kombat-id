import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SupabaseInstructorAccountRequestRepository } from "@/modules/instructor-account-requests/infrastructure/repositories/supabaseInstructorAccountRequestRepository";
import { listInstructorAccountRequests } from "@/modules/instructor-account-requests/application/use-cases/listInstructorAccountRequests";
import type { InstructorAccountRequestListItem } from "@/modules/instructor-account-requests/presentation/components/instructorAccountRequestListItem";
import type { InstructorAccountRequestStatus } from "@/modules/instructor-account-requests/domain/entities/instructorAccountRequest";
import { InstructorRequestsTable } from "@/modules/instructor-account-requests/presentation/components/InstructorRequestsTable";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

async function requireAdmin() {
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

const STATUS_LABELS: Record<InstructorAccountRequestStatus | "all", string> = {
  all: "Todos",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  observed: "Observado",
};

const STATUS_OPTIONS = [
  "all",
  "pending",
  "approved",
  "rejected",
  "observed",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && v !== "all") params.set(k, v);
  }
  const qs = params.toString();
  return `/admin/instructor-requests${qs ? `?${qs}` : ""}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InstructorRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const rawStatus = sp.status;
  const statusFilter: InstructorAccountRequestStatus | undefined =
    rawStatus === "pending" ||
    rawStatus === "approved" ||
    rawStatus === "rejected" ||
    rawStatus === "observed"
      ? rawStatus
      : undefined;

  // Composition root — instantiate repository and call use case
  const repo = new SupabaseInstructorAccountRequestRepository();
  const { items, total } = await listInstructorAccountRequests(
    {
      ...(statusFilter ? { status: statusFilter } : {}),
      page,
      pageSize: PAGE_SIZE,
    },
    { repo },
  );

  // Map domain entities to serializable list items (exclude sensitive fields)
  const requests: InstructorAccountRequestListItem[] = items.map((item) => ({
    id: item.id,
    email: item.email,
    fullName: item.fullName,
    rut: item.rut,
    phone: item.phone,
    academyName: item.academyName,
    message: item.message,
    status: item.status,
    observationNotes: item.observationNotes,
    createdAt: item.createdAt,
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentStatusKey = rawStatus ?? "all";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Solicitudes de Instructores
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {total.toLocaleString("es-CL")}{" "}
            {total === 1 ? "solicitud" : "solicitudes"}
            {statusFilter ? ` · filtro: ${STATUS_LABELS[statusFilter]}` : ""}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map((option) => {
          const isActive = currentStatusKey === option;
          return (
            <Link
              key={option}
              href={buildUrl(
                { page: undefined },
                { status: option === "all" ? undefined : option },
              )}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isActive
                  ? "bg-primary-600 border-primary-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
              }`}
            >
              {STATUS_LABELS[option]}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <InstructorRequestsTable
          requests={requests}
          totalCount={total}
          page={page}
          totalPages={totalPages}
        />
      </div>

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
                href={buildUrl(
                  { status: statusFilter },
                  { page: String(page - 1) },
                )}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <Link
                  key={p}
                  href={buildUrl({ status: statusFilter }, { page: String(p) })}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                    p === page
                      ? "bg-primary-600 border-primary-600 text-white"
                      : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
                  }`}
                >
                  {p}
                </Link>
              );
            })}
            {page < totalPages && (
              <Link
                href={buildUrl(
                  { status: statusFilter },
                  { page: String(page + 1) },
                )}
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
