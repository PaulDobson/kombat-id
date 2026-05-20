"use client";

import { useState, useMemo } from "react";
import { RegistrationRowActions } from "../../RegistrationRowActions";
import { PractitionerDetailModal } from "./PractitionerDetailModal";
import type { RegistrationRow } from "../../RegistrationsGrouped";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: "Pendiente pago",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  pendiente_pago: "bg-amber-900/40 text-amber-400 border border-amber-800/60",
  confirmada: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
  cancelada: "bg-neutral-800 text-neutral-500 border border-neutral-700",
};

const ROW_ACCENT: Record<string, string> = {
  pendiente_pago: "border-l-amber-500",
  confirmada: "border-l-emerald-500",
  cancelada: "border-l-neutral-700",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPageNums(current: number, total: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return pages;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  rows: RegistrationRow[];
  eventId: string;
}

export function AcademyStudentsTable({ rows, eventId }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<
    string | null
  >(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.practitionerName.toLowerCase().includes(q) ||
        (r.rut?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg
            className="w-4 h-4 text-neutral-500"
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
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          className="w-full pl-9 pr-9 py-2.5 bg-neutral-900 border border-neutral-700/60 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-700 transition-colors"
        />
        {search && (
          <button
            onClick={() => handleSearch("")}
            aria-label="Limpiar búsqueda"
            className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Resumen */}
      <p className="text-xs text-neutral-500 px-1">
        {filtered.length} de {rows.length} inscripci
        {rows.length !== 1 ? "ones" : "ón"}
        {search && (
          <span className="text-neutral-600"> · filtrando por «{search}»</span>
        )}
      </p>

      {/* Tabla */}
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              No se encontraron alumnos para «{search}»
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700/60 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    RUT
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Instructor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Inscripción
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {paginated.map((reg) => (
                  <tr
                    key={reg.id}
                    className={`border-l-2 hover:bg-neutral-800/30 transition-colors ${ROW_ACCENT[reg.status] ?? "border-l-neutral-700"}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setSelectedPractitionerId(reg.practitionerId)
                        }
                        className="font-medium text-neutral-100 hover:text-primary-400 transition-colors text-left"
                      >
                        {reg.practitionerName || "—"}
                      </button>
                      {reg.notes && (
                        <p
                          title={reg.notes}
                          className="text-xs text-amber-500/70 italic line-clamp-1 mt-0.5"
                        >
                          &ldquo;{reg.notes}&rdquo;
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {reg.rut ? (
                        <span className="font-mono text-xs text-neutral-300">
                          {reg.rut}
                        </span>
                      ) : (
                        <span className="text-neutral-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400 hidden md:table-cell">
                      {reg.instructorName || (
                        <span className="text-neutral-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[reg.status] ?? STATUS_STYLES.cancelada}`}
                      >
                        {STATUS_LABELS[reg.status] ?? reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 tabular-nums hidden lg:table-cell">
                      {formatDate(reg.registeredAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RegistrationRowActions reg={reg} eventId={eventId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle practicante */}
      <PractitionerDetailModal
        practitionerId={selectedPractitionerId}
        onClose={() => setSelectedPractitionerId(null)}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-neutral-500">
            Página {page} de {totalPages} · {filtered.length} alumno
            {filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            {getPageNums(page, totalPages).map((item, idx) =>
              item === "..." ? (
                <span
                  key={`e-${idx}`}
                  className="px-1 text-xs text-neutral-600"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`min-w-7 h-7 px-2 rounded-lg text-xs font-medium transition-all ${
                    page === item
                      ? "bg-primary-700 text-white border border-primary-600"
                      : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
