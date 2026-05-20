"use client";

import { useState, useMemo } from "react";
import { ConfirmPaymentButton } from "./ConfirmPaymentButton";
import { CancelRegistrationButton } from "./CancelRegistrationButton";
import type { RegistrationRow } from "./RegistrationsGrouped";
import { formatDateShort } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: "Pendiente pago",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  pendiente_pago:
    "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  confirmada: "bg-success-900/50 text-success-400 border border-success-800",
  cancelada: "bg-neutral-800 text-neutral-500 border border-neutral-700",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  registrations: RegistrationRow[];
  eventId: string;
}

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------

function getPageNumbers(current: number, total: number): (number | "...")[] {
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

export function RegistrationsList({ registrations, eventId }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Normaliza el RUT eliminando puntos y guión para comparación flexible
  function normalizeRut(rut: string) {
    return rut.replace(/[.\-]/g, "").toLowerCase();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registrations;

    const qNorm = normalizeRut(q);

    return registrations.filter((r) => {
      const nameMatch = r.practitionerName.toLowerCase().includes(q);
      const rutMatch = r.rut ? normalizeRut(r.rut).includes(qNorm) : false;
      const academyMatch = r.academyName
        ? r.academyName.toLowerCase().includes(q)
        : false;
      return nameMatch || rutMatch || academyMatch;
    });
  }, [registrations, query]);

  function handleSearch(val: string) {
    setQuery(val);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
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
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, RUT o academia..."
          className="w-full pl-9 pr-10 py-2.5 bg-neutral-900 border border-neutral-700/60 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-700 transition-colors"
        />
        {query && (
          <button
            onClick={() => handleSearch("")}
            className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
            aria-label="Limpiar búsqueda"
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

      {/* Contador de resultados */}
      {query && (
        <p className="text-xs text-neutral-500 px-1">
          {filtered.length === 0
            ? "Sin resultados"
            : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} para «${query}»`}
        </p>
      )}

      {/* Tabla */}
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              {query
                ? `No se encontraron resultados para «${query}»`
                : "No hay inscripciones para este evento."}
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
                    RUT
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Academia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
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
                {paginated.map((reg) => (
                  <tr
                    key={reg.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    {/* Alumno */}
                    <td className="px-4 py-3">
                      <p className="text-neutral-100 font-medium">
                        {reg.practitionerName || "—"}
                      </p>
                      <p className="text-neutral-500 text-xs mt-0.5 sm:hidden tabular-nums">
                        {reg.rut ?? "—"}
                      </p>
                    </td>

                    {/* RUT */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-neutral-400 text-xs tabular-nums">
                        {reg.rut ?? "—"}
                      </p>
                    </td>

                    {/* Academia */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {reg.academyName ? (
                        <div>
                          <p className="text-neutral-300 text-xs">
                            {reg.academyName}
                          </p>
                          {reg.academyCity && (
                            <p className="text-neutral-500 text-xs">
                              {reg.academyCity}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[reg.status] ?? STATUS_STYLES.cancelada}`}
                      >
                        {STATUS_LABELS[reg.status] ?? reg.status}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 text-neutral-400 text-xs tabular-nums hidden sm:table-cell">
                      {formatDateShort(reg.registeredAt)}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {reg.status === "pendiente_pago" && (
                          <ConfirmPaymentButton
                            registrationId={reg.id}
                            eventId={eventId}
                          />
                        )}
                        {reg.status !== "cancelada" && (
                          <CancelRegistrationButton
                            registrationId={reg.id}
                            eventId={eventId}
                          />
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-neutral-500">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>

          <div className="flex items-center gap-1">
            {/* Anterior */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
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

            {/* Números de página */}
            {getPageNumbers(page, totalPages).map((item, idx) =>
              item === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
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

            {/* Siguiente */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
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
