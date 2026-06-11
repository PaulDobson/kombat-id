import { adminSupabase } from "@/lib/supabase/admin";
import Link from "next/link";
import { GRADE_LABELS, GRADE_STYLES } from "@/lib/presentation-constants";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import {
  Search,
  Users,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GraduationCap,
  Info,
} from "lucide-react";
import { ReactivateStudentButton } from "../students/[id]/ReactivateStudentButton";

const PAGE_SIZE = 10;

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
  searchQuery: string;
  page: number;
  /** Pre-fetched academy member IDs (all, active + inactive) shared with AcademySection */
  academyMemberIds: string[];
  /** When true, shows only inactive students */
  showInactive?: boolean;
}

export async function StudentSection({
  practitionerId: _practitionerId,
  searchQuery,
  page,
  academyMemberIds,
  showInactive = false,
}: Props) {
  const offset = (page - 1) * PAGE_SIZE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let studentsQuery: any = adminSupabase
    .from("practitioners")
    .select(
      "id, full_name, rut, grade, dan, is_active, auth_user_id, start_date",
      { count: "exact" },
    )
    .not("role", "in", '("instructor","profesor","maestro")')
    .order("full_name");

  if (academyMemberIds.length > 0) {
    studentsQuery = studentsQuery.in("id", academyMemberIds);
  } else {
    // No members — return empty result set without a full table scan
    studentsQuery = studentsQuery.eq(
      "id",
      "00000000-0000-0000-0000-000000000000",
    );
  }

  // Filter by active/inactive state
  studentsQuery = studentsQuery.eq("is_active", !showInactive);

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
    auth_user_id: string | null;
    start_date: string | null;
  }>;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Enrich current page with academy names — one query for the whole page
  const pageIds = students.map((s) => s.id);
  const academyByStudent = new Map<string, string>();
  if (pageIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id, academies(name)")
      .in("practitioner_id", pageIds)
      .eq("is_active", true);

    for (const m of memberships ?? []) {
      const name = (m.academies as { name: string } | null)?.name;
      if (name) academyByStudent.set(m.practitioner_id as string, name);
    }
  }

  return (
    <section className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100">
              Mis alumnos
            </h2>
            <p className="text-xs text-neutral-500">
              {totalCount.toLocaleString("es-CL")} registro
              {totalCount !== 1 ? "s" : ""}
              {searchQuery && ` para "${searchQuery}"`}
            </p>
          </div>
        </div>

        {/* Active / Inactive toggle */}
        <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1">
          <a
            href={buildUrl(
              { q: searchQuery || undefined },
              { inactive: undefined },
            )}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              !showInactive
                ? "bg-neutral-700 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Activos
          </a>
          <a
            href={buildUrl({ q: searchQuery || undefined, inactive: "1" }, {})}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              showInactive
                ? "bg-neutral-700 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Inactivos
          </a>
        </div>
      </div>

      {/* Search bar */}
      <form method="GET" action="/instructor" className="flex gap-2">
        {/* Preserve inactive tab state across searches */}
        {showInactive && <input type="hidden" name="inactive" value="1" />}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
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
            href={showInactive ? "/instructor?inactive=1" : "/instructor"}
            className="px-4 py-2 bg-transparent border border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden">
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
              <Users className="w-6 h-6 text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-sm">
              {searchQuery
                ? `No se encontraron alumnos con el nombre "${searchQuery}".`
                : showInactive
                  ? "No tienes alumnos inactivos."
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Academia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      s.is_active
                        ? "hover:bg-neutral-800/40"
                        : "bg-neutral-900/60 hover:bg-neutral-800/30 opacity-75"
                    }`}
                  >
                    <td className="px-4 py-3 text-neutral-100 font-medium">
                      {s.full_name}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden sm:table-cell">
                      {s.rut}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[s.grade]}`}
                      >
                        {GRADE_LABELS[s.grade]}
                        {s.dan ? ` ${s.dan}° Dan` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden lg:table-cell">
                      {s.start_date ?? (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs hidden md:table-cell max-w-40 truncate">
                      {academyByStudent.get(s.id) ?? (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                          Activo
                        </span>
                      ) : s.auth_user_id === null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-amber-900/40 text-amber-400 border border-amber-700/60 px-2 py-0.5 rounded-full text-xs">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"
                              aria-hidden="true"
                            />
                            Pendiente
                          </span>
                          <span
                            className="group relative"
                            title="El alumno aún no ha activado su cuenta. Comparte el link de activación para que pueda ingresar al sistema."
                          >
                            <Info className="w-3.5 h-3.5 text-neutral-600 hover:text-amber-400 transition-colors cursor-help" />
                          </span>
                        </div>
                      ) : (
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {!s.is_active ? (
                          <ReactivateStudentButton
                            publicId={s.id}
                            studentName={s.full_name}
                          />
                        ) : (
                          <>
                            <Link
                              href={`/instructor/students/${s.id}`}
                              title="Ver ficha"
                              className="p-1.5 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-neutral-800 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">Ver ficha</span>
                            </Link>
                            <Link
                              href={`/instructor/grade-exams/new?practitionerId=${s.id}`}
                              title="Iniciar examen de grado"
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800 transition-colors"
                            >
                              <GraduationCap className="w-4 h-4" />
                              <span className="sr-only">
                                Iniciar examen de grado
                              </span>
                            </Link>
                            <Link
                              href={`/instructor/students/${s.id}/edit`}
                              title="Editar alumno"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              <span className="sr-only">Editar alumno</span>
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Página {page} de {totalPages} · {totalCount.toLocaleString("es-CL")}{" "}
            registros
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={buildUrl(
                  {
                    q: searchQuery || undefined,
                    inactive: showInactive ? "1" : undefined,
                  },
                  { page: String(page - 1) },
                )}
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
                  href={buildUrl(
                    {
                      q: searchQuery || undefined,
                      inactive: showInactive ? "1" : undefined,
                    },
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
                  {
                    q: searchQuery || undefined,
                    inactive: showInactive ? "1" : undefined,
                  },
                  { page: String(page + 1) },
                )}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
