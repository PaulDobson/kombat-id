"use client";

import { useState, useTransition, useMemo } from "react";
import { enrollStudentsAction } from "@/modules/event-registration/presentation/actions/enrollStudentsAction";

interface Student {
  id: string;
  full_name: string;
  grade: string;
  dan: number | null;
}

interface EnrollResult {
  enrolled: string[];
  skipped: { id: string; name: string }[];
}

interface Props {
  eventId: string;
  students: Student[];
  isCompetition?: boolean;
}

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_STYLES: Record<string, string> = {
  white: "bg-neutral-700 text-neutral-200 border border-neutral-600",
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  green: "bg-green-900/50 text-green-400 border border-green-800",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-800",
  red: "bg-red-900/50 text-red-400 border border-red-800",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

const PAGE_SIZE = 10;

export function EnrollForm({
  eventId,
  students,
  isCompetition = false,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<EnrollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Filtered list based on search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.full_name.toLowerCase().includes(q));
  }, [students, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // All visible (filtered) ids
  const filteredIds = useMemo(
    () => new Set(filtered.map((s) => s.id)),
    [filtered],
  );
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  function toggleStudent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await enrollStudentsAction({
        eventId,
        practitionerIds: Array.from(selected),
      });
      if (res.success) {
        setResult(res.data);
        setSelected(new Set());
      } else {
        setError(res.error);
      }
    });
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-br from-neutral-800 to-neutral-800/50 rounded-2xl border border-neutral-700 mb-5 shadow-lg">
          <svg
            className="w-10 h-10 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-neutral-300 mb-2">
          Sin alumnos disponibles
        </h3>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
          No tienes alumnos asignados para inscribir. Asegúrate de tener alumnos
          activos en tu academia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Result summary */}
      {result && (
        <div className="relative overflow-hidden bg-linear-to-br from-neutral-900 to-neutral-900/50 border border-neutral-700 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-success-500/20 rounded-lg border border-success-500/30">
                <svg
                  className="w-5 h-5 text-success-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-neutral-100">
                Resultado de la inscripción
              </h3>
            </div>

            {result.enrolled.length > 0 && (
              <div className="bg-success-500/10 border border-success-500/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-success-300 uppercase tracking-wider flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Inscritos exitosamente ({result.enrolled.length})
                </p>
                <ul className="space-y-1.5">
                  {result.enrolled.map((name) => (
                    <li
                      key={name}
                      className="text-sm text-neutral-200 flex items-center gap-2 pl-1"
                    >
                      <span className="w-1.5 h-1.5 bg-success-500 rounded-full" />
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.skipped.length > 0 && (
              <div className="bg-warning-500/10 border border-warning-500/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-warning-300 uppercase tracking-wider flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Omitidos — ya inscritos ({result.skipped.length})
                </p>
                <ul className="space-y-1.5">
                  {result.skipped.map((s) => (
                    <li
                      key={s.id}
                      className="text-sm text-neutral-400 flex items-center gap-2 pl-1"
                    >
                      <span className="w-1.5 h-1.5 bg-warning-500 rounded-full" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="relative overflow-hidden bg-linear-to-br from-error-500/10 to-error-500/5 border border-error-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-error-500/20 rounded-lg border border-error-500/30 shrink-0">
              <svg
                className="w-5 h-5 text-error-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-error-300 pt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toolbar: search + selection summary */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
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
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              disabled={isPending}
              className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
          <span className="text-xs text-neutral-500 shrink-0">
            {selected.size} de {students.length} seleccionados
          </span>
        </div>

        {/* Table */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-lg">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-800 rounded-full border border-neutral-700 mb-4">
                <svg
                  className="w-8 h-8 text-neutral-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <p className="text-neutral-500 text-sm">
                No se encontraron alumnos con ese nombre.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="px-4 py-4 w-10">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAllFiltered}
                        disabled={isPending}
                        title="Seleccionar todos los filtrados"
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900 cursor-pointer transition-all hover:scale-110"
                      />
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  {isCompetition && (
                    <th className="text-left px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Grado
                    </th>
                  )}
                  <th className="text-right px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider w-32">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {paginated.map((student) => {
                  const isSelected = selected.has(student.id);
                  return (
                    <tr
                      key={student.id}
                      onClick={() => !isPending && toggleStudent(student.id)}
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-primary-900/30 hover:bg-primary-900/40 border-l-4 border-primary-500"
                          : "hover:bg-neutral-800/60 border-l-4 border-transparent"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(student.id)}
                            disabled={isPending}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900 cursor-pointer transition-all hover:scale-110"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full transition-all ${
                              isSelected
                                ? "bg-primary-500 animate-pulse"
                                : "bg-neutral-600"
                            }`}
                          />
                          <span
                            className={`font-medium transition-colors ${
                              isSelected
                                ? "text-neutral-50"
                                : "text-neutral-200"
                            }`}
                          >
                            {student.full_name}
                          </span>
                        </div>
                      </td>
                      {isCompetition && (
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${GRADE_STYLES[student.grade] ?? GRADE_STYLES.white}`}
                          >
                            {GRADE_LABELS[student.grade] ?? student.grade}
                            {student.dan ? ` ${student.dan}° Dan` : ""}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-4 text-right">
                        {isSelected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-primary-900/60 text-primary-300 border border-primary-700/50 animate-in fade-in zoom-in duration-200">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Seleccionado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Página {currentPage} de {totalPages} · {filtered.length} alumnos
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isPending}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(
                  1,
                  Math.min(currentPage - 2, totalPages - 4),
                );
                const p = start + i;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    disabled={isPending}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                      p === currentPage
                        ? "bg-primary-600 border-primary-600 text-white"
                        : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isPending}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || selected.size === 0}
            className="group relative inline-flex items-center justify-center gap-2 bg-linear-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-6 py-3.5 rounded-xl text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-neutral-700 disabled:to-neutral-700 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isPending ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Inscribiendo...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <span>
                  Inscribir{" "}
                  {selected.size > 0 &&
                    `${selected.size} ${selected.size === 1 ? "alumno" : "alumnos"}`}
                </span>
                {selected.size > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 bg-white text-primary-700 rounded-full text-xs font-bold shadow-lg animate-in zoom-in duration-200">
                    {selected.size}
                  </span>
                )}
              </>
            )}
          </button>
          {selected.size > 0 && !isPending && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors px-4 py-2 hover:bg-neutral-800/50 rounded-lg"
            >
              Limpiar selección
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
