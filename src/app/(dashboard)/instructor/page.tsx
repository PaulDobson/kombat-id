import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import { isInstructorRole } from "@/lib/roles";
import { formatDateShort } from "@/lib/format-date";
import { RequestCertificationForm } from "./RequestCertificationForm";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;
const REQ_PAGE_SIZE = 10;

const GRADE_LABELS: Record<Grade, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_STYLES: Record<Grade, string> = {
  white: "bg-neutral-700 text-neutral-200 border border-neutral-600",
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  green: "bg-green-900/50 text-green-400 border border-green-800",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-800",
  red: "bg-red-900/50 text-red-400 border border-red-800",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

const REGION_LABELS: Record<ChileanRegion, string> = {
  arica_y_parinacota: "Arica y Parinacota",
  tarapaca: "Tarapacá",
  antofagasta: "Antofagasta",
  atacama: "Atacama",
  coquimbo: "Coquimbo",
  valparaiso: "Valparaíso",
  metropolitana: "Metropolitana",
  ohiggins: "O'Higgins",
  maule: "Maule",
  nuble: "Ñuble",
  biobio: "Biobío",
  araucania: "Araucanía",
  los_rios: "Los Ríos",
  los_lagos: "Los Lagos",
  aysen: "Aysén",
  magallanes: "Magallanes",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "pending":
      return {
        label: "Pendiente",
        className: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
      };
    case "approved":
      return {
        label: "Aprobada",
        className: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
      };
    case "rejected":
      return {
        label: "Rechazada",
        className: "bg-red-900/50 text-red-400 border-red-800",
      };
    case "observed":
      return {
        label: "Observada",
        className: "bg-blue-900/50 text-blue-400 border-blue-800",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-800 text-neutral-400 border-neutral-700",
      };
  }
}

const CERT_TYPE_LABELS: Record<string, string> = {
  technical_grade: "Grado técnico",
  instructor: "Instructor",
  referee: "Árbitro",
  coach: "Entrenador",
  event_participation: "Participación en evento",
};

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InstructorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; reqPage?: string; q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const searchQuery = sp.q?.trim() ?? "";

  // Find practitioner profile
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Guard: must be an instructor role
  if (!practitioner || !isInstructorRole(practitioner.role as string)) {
    redirect("/dashboard");
  }

  // ── Section A: Mis alumnos (paginated) ────────────────────────────────────
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Get academies where this instructor is responsible
  const { data: academyRows } = await adminSupabase
    .from("academies")
    .select("id, name, region, city, is_active")
    .contains("responsible_instructor_ids", [practitioner.id]);

  const academies = academyRows ?? [];
  const academyIds = academies.map((a: { id: string }) => a.id);

  // Get all active members of those academies
  let academyMemberIds: string[] = [];
  if (academyIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id")
      .in("academy_id", academyIds)
      .eq("is_active", true);
    academyMemberIds = (memberships ?? []).map(
      (m: { practitioner_id: string }) => m.practitioner_id,
    );
  }

  // Build students query: members of the instructor's academies, with optional name search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let studentsQuery: any = adminSupabase
    .from("practitioners")
    .select("id, full_name, rut, grade, dan, is_active, start_date", {
      count: "exact",
    })
    .not("role", "in", '("instructor","profesor","maestro")')
    .order("full_name");

  if (academyMemberIds.length > 0) {
    studentsQuery = studentsQuery.in("id", academyMemberIds);
  } else {
    studentsQuery = studentsQuery.eq(
      "id",
      "00000000-0000-0000-0000-000000000000",
    );
  }

  if (searchQuery) {
    studentsQuery = studentsQuery.ilike("full_name", `%${searchQuery}%`);
  }

  const { data: studentRows, count } = await studentsQuery.range(
    offset,
    offset + PAGE_SIZE - 1,
  );

  const students = (studentRows ?? []) as Array<{
    id: string;
    full_name: string;
    rut: string;
    grade: Grade;
    dan: number | null;
    is_active: boolean;
    start_date: string | null;
  }>;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Active students for certification form — same academy-based filter
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

  // ── Section B: Mis academias (already fetched above) ─────────────────────

  // ── Section D: Mis solicitudes (paginated) ────────────────────────────────
  const reqPage = Math.max(1, parseInt(sp.reqPage ?? "1", 10));
  const reqOffset = (reqPage - 1) * REQ_PAGE_SIZE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requestRows, count: reqCount } = await (adminSupabase as any)
    .from("certification_requests")
    .select(
      "id, cert_type, status, rejection_reason, observation_notes, created_at, practitioners!practitioner_id(full_name, rut)",
      { count: "exact" },
    )
    .eq("requester_id", practitioner.id)
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Panel de Instructor
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Bienvenido, {practitioner.full_name}
        </p>
      </div>

      {/* ── Section A: Mis alumnos ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              Mis alumnos
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {totalCount.toLocaleString("es-CL")} registros
              {searchQuery && ` para "${searchQuery}"`}
            </p>
          </div>
          <Link
            href="/instructor/register"
            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            Registrar alumno
          </Link>
        </div>

        {/* Search bar */}
        <form method="GET" action="/instructor" className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Buscar por nombre..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors"
          >
            Buscar
          </button>
          {searchQuery && (
            <Link
              href="/instructor"
              className="px-4 py-2 bg-transparent border border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Limpiar
            </Link>
          )}
        </form>

        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          {students.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-neutral-500 text-sm">
                {searchQuery
                  ? `No se encontraron alumnos con el nombre "${searchQuery}".`
                  : "No tienes alumnos asignados."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900/80">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      RUT
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Grado
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                      Inscripción
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-neutral-100 font-medium">
                        {s.full_name}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden sm:table-cell">
                        {s.rut}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[s.grade as Grade]}`}
                        >
                          {GRADE_LABELS[s.grade as Grade]}
                          {s.dan ? ` ${s.dan}° Dan` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden lg:table-cell">
                        {s.start_date ?? (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.is_active ? (
                          <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                            Activo
                          </span>
                        ) : (
                          <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Ver ficha */}
                          <Link
                            href={`/instructor/students/${s.id}`}
                            title="Ver ficha"
                            className="p-1.5 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-neutral-800 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4"
                              aria-hidden="true"
                            >
                              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                              <path
                                fillRule="evenodd"
                                d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="sr-only">Ver ficha</span>
                          </Link>
                          {/* Editar alumno */}
                          <Link
                            href={`/instructor/students/${s.id}/edit`}
                            title="Editar alumno"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4"
                              aria-hidden="true"
                            >
                              <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                            </svg>
                            <span className="sr-only">Editar alumno</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Página {page} de {totalPages} ·{" "}
              {totalCount.toLocaleString("es-CL")} registros
            </p>
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Link
                  href={buildUrl(
                    { q: searchQuery || undefined },
                    { page: String(page - 1) },
                  )}
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
                    href={buildUrl(
                      { q: searchQuery || undefined },
                      { page: String(p2) },
                    )}
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
                  href={buildUrl(
                    { q: searchQuery || undefined },
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
      </section>

      {/* ── Section B: Mis academias ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-100">
            Mis academias
          </h2>
          <Link
            href="/instructor/academies/new"
            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            + Crear academia
          </Link>
        </div>

        {academies.length === 0 ? (
          <p className="text-neutral-500 text-sm py-4">
            No estás vinculado a ninguna academia.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {academies.map(
              (a: {
                id: string;
                name: string;
                region: string;
                city: string;
                is_active: boolean;
              }) => (
                <div
                  key={a.id}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-100 leading-snug">
                      {a.name}
                    </p>
                    {a.is_active ? (
                      <span className="shrink-0 bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                        Activa
                      </span>
                    ) : (
                      <span className="shrink-0 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">
                    {a.city}
                    {a.region
                      ? `, ${REGION_LABELS[a.region as ChileanRegion] ?? a.region}`
                      : ""}
                  </p>
                  <Link
                    href={`/instructor/academies/${a.id}`}
                    className="self-start text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Administrar academia →
                  </Link>
                </div>
              ),
            )}
          </div>
        )}
      </section>
      {/* ── Section C: Solicitar certificación ── */}
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

      {/* ── Section D: Mis solicitudes ── */}
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
                    const badge = getStatusBadge(r.status);
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
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                          >
                            {badge.label}
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

        {/* Pagination */}
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
                    { page: sp.page },
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
                    href={buildUrl({ page: sp.page }, { reqPage: String(p2) })}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                      p2 === reqPage
                        ? "bg-primary-600 border-primary-600 text-white"
                        : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
                    }`}
                  >
                    {p2}
                  </Link>
                );
              })}
              {reqPage < reqTotalPages && (
                <Link
                  href={buildUrl(
                    { page: sp.page },
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
    </main>
  );
}
