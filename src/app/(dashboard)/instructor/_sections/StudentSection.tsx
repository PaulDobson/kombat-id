import { adminSupabase } from "@/lib/supabase/admin";
import Link from "next/link";
import { GRADE_LABELS, GRADE_STYLES } from "@/lib/presentation-constants";
import { RegisterStudentModal } from "./RegisterStudentModal";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";

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
  /** Pre-fetched academy member IDs shared with AcademySection to avoid duplicate query */
  academyMemberIds: string[];
}

export async function StudentSection({
  practitionerId: _practitionerId,
  searchQuery,
  page,
  academyMemberIds,
}: Props) {
  const offset = (page - 1) * PAGE_SIZE;

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

  return (
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
        <RegisterStudentModal />
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
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${p2 === page ? "bg-primary-600 border-primary-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"}`}
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
  );
}
