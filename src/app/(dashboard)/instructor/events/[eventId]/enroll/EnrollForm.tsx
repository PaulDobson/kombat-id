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
      <p className="text-neutral-500 text-sm py-8 text-center">
        No tienes alumnos asignados para inscribir.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Result summary */}
      {result && (
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-100">
            Resultado de la inscripción
          </h3>
          {result.enrolled.length > 0 && (
            <div>
              <p className="text-xs font-medium text-success-400 uppercase tracking-wider mb-1">
                Inscritos correctamente ({result.enrolled.length})
              </p>
              <ul className="space-y-0.5">
                {result.enrolled.map((name) => (
                  <li key={name} className="text-sm text-neutral-200">
                    ✓ {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.skipped.length > 0 && (
            <div>
              <p className="text-xs font-medium text-warning-400 uppercase tracking-wider mb-1">
                Omitidos — ya inscritos ({result.skipped.length})
              </p>
              <ul className="space-y-0.5">
                {result.skipped.map((s) => (
                  <li key={s.id} className="text-sm text-neutral-400">
                    — {s.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="text-sm text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-4 py-3"
        >
          {error}
        </p>
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
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-10">
              No se encontraron alumnos con ese nombre.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      disabled={isPending}
                      title="Seleccionar todos los filtrados"
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-neutral-900"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  {isCompetition && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Grado
                    </th>
                  )}
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider w-24">
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
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary-900/20" : "hover:bg-neutral-800/40"}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(student.id)}
                          disabled={isPending}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-neutral-900"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-100 font-medium">
                        {student.full_name}
                      </td>
                      {isCompetition && (
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[student.grade] ?? GRADE_STYLES.white}`}
                          >
                            {GRADE_LABELS[student.grade] ?? student.grade}
                            {student.dan ? ` ${student.dan}° Dan` : ""}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        {isSelected && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-900/50 text-primary-400 border border-primary-800">
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
        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={isPending || selected.size === 0}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? "Inscribiendo..."
              : `Inscribir seleccionados (${selected.size})`}
          </button>
          {selected.size > 0 && !isPending && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Limpiar selección
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
