import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import { RequestCertificationForm } from "./RequestCertificationForm";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"];

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
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  // Find practitioner profile
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Guard: must be an instructor role
  if (!practitioner || !INSTRUCTOR_ROLES.includes(practitioner.role ?? "")) {
    redirect("/dashboard");
  }

  // ── Section A: Mis alumnos (paginated) ────────────────────────────────────
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const { data: studentRows, count } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, rut, grade, dan, is_active, start_date", {
      count: "exact",
    })
    .eq("instructor_id", practitioner.id)
    .order("full_name")
    .range(offset, offset + PAGE_SIZE - 1);

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

  // Active students for certification form (all pages, no pagination needed for the select)
  const { data: allActiveStudentRows } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, rut")
    .eq("instructor_id", practitioner.id)
    .eq("is_active", true)
    .order("full_name")
    .limit(500);

  const activeStudentsForForm = (allActiveStudentRows ?? []).map(
    (s: { id: string; full_name: string; rut: string }) => ({
      id: s.id,
      fullName: s.full_name,
      rut: s.rut,
    }),
  );

  // ── Section B: Mis academias ──────────────────────────────────────────────
  const { data: academyRows } = await adminSupabase
    .from("academies")
    .select("id, name, region, city, is_active")
    .contains("responsible_instructor_ids", [practitioner.id]);

  const academies = academyRows ?? [];

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
            </p>
          </div>
          <Link
            href="/instructor/register"
            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            Registrar alumno
          </Link>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          {students.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-neutral-500 text-sm">
                No tienes alumnos asignados.
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
                        <Link
                          href={`/admin/practitioners/${s.id}`}
                          className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                        >
                          Ver
                        </Link>
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
      </section>

      {/* ── Section B: Mis academias ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-100">
          Mis academias
        </h2>

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
                    href={`/admin/academies/${a.id}`}
                    className="self-start text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Ver academia →
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
    </main>
  );
}
