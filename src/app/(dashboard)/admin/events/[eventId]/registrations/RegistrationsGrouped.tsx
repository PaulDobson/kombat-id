"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistrationRow {
  id: string;
  practitionerId: string;
  practitionerName: string;
  instructorName: string;
  rut: string | null;
  status: string;
  registeredAt: string;
  notes: string | null;
  academyId: string | null;
  academyName: string | null;
  academyCity: string | null;
  academyRegion: string | null;
}

interface Props {
  registrations: RegistrationRow[];
  eventId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION_LABELS: Record<string, string> = {
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

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AcademyGroup {
  academyId: string | null;
  academyName: string;
  city: string | null;
  region: string | null;
  confirmed: number;
  pending: number;
  cancelled: number;
  total: number;
}

function groupByAcademy(registrations: RegistrationRow[]): AcademyGroup[] {
  const map = new Map<string, AcademyGroup>();

  for (const reg of registrations) {
    const key = reg.academyId ?? "__sin_academia__";
    if (!map.has(key)) {
      map.set(key, {
        academyId: reg.academyId,
        academyName: reg.academyName ?? "Sin academia",
        city: reg.academyCity,
        region: reg.academyRegion,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        total: 0,
      });
    }
    const g = map.get(key)!;
    g.total++;
    if (reg.status === "confirmada") g.confirmed++;
    else if (reg.status === "pendiente_pago") g.pending++;
    else if (reg.status === "cancelada") g.cancelled++;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.academyId === null) return 1;
    if (b.academyId === null) return -1;
    return b.total - a.total;
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
// Main component
// ---------------------------------------------------------------------------

export function RegistrationsGrouped({ registrations, eventId }: Props) {
  const [nameSearch, setNameSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [page, setPage] = useState(1);

  const groups = useMemo(() => groupByAcademy(registrations), [registrations]);

  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      if (g.region) set.add(g.region);
    }
    return Array.from(set).sort((a, b) =>
      (REGION_LABELS[a] ?? a).localeCompare(REGION_LABELS[b] ?? b, "es"),
    );
  }, [groups]);

  const filtered = useMemo(() => {
    const q = nameSearch.trim().toLowerCase();
    return groups.filter((g) => {
      const matchName =
        !q ||
        g.academyName.toLowerCase().includes(q) ||
        (g.city?.toLowerCase().includes(q) ?? false);
      const matchRegion = !regionFilter || g.region === regionFilter;
      return matchName && matchRegion;
    });
  }, [groups, nameSearch, regionFilter]);

  function handleSearch(val: string) {
    setNameSearch(val);
    setPage(1);
  }

  function handleRegion(val: string) {
    setRegionFilter(val);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredTotal = filtered.reduce((a, g) => a + g.total, 0);
  const filteredPending = filtered.reduce((a, g) => a + g.pending, 0);

  if (registrations.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500 text-sm">
          No hay inscripciones para este evento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Búsqueda por nombre */}
        <div className="relative flex-1 min-w-48">
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
            value={nameSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por academia..."
            className="w-full pl-9 pr-9 py-2.5 bg-neutral-900 border border-neutral-700/60 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-700 transition-colors"
          />
          {nameSearch && (
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

        {/* Filtro por región */}
        <select
          value={regionFilter}
          onChange={(e) => handleRegion(e.target.value)}
          className="px-3 py-2.5 bg-neutral-900 border border-neutral-700/60 rounded-xl text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-700 transition-colors"
        >
          <option value="">Todas las regiones</option>
          {availableRegions.map((r) => (
            <option key={r} value={r}>
              {REGION_LABELS[r] ?? r}
            </option>
          ))}
        </select>
      </div>

      {/* Resumen */}
      <p className="text-xs text-neutral-500 px-1">
        <span>
          {filtered.length} academia{filtered.length !== 1 ? "s" : ""}
        </span>
        <span className="text-neutral-700 mx-1.5">·</span>
        <span>{filteredTotal} inscripciones</span>
        {filteredPending > 0 && (
          <>
            <span className="text-neutral-700 mx-1.5">·</span>
            <span className="text-amber-500 font-medium">
              {filteredPending} pendiente{filteredPending !== 1 ? "s" : ""}
            </span>
          </>
        )}
      </p>

      {/* Tabla */}
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              No se encontraron academias para los filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700/60 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Academia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Región
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-emerald-500 uppercase tracking-wider">
                    Conf.
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-amber-500 uppercase tracking-wider">
                    Pend.
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                    Canc.
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {paginated.map((group) => {
                  const href = `/admin/events/${eventId}/registrations/academia/${group.academyId ?? "sin-academia"}`;
                  return (
                    <tr
                      key={group.academyId ?? "__sin_academia__"}
                      className="hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-100 leading-snug">
                          {group.academyName}
                        </p>
                        {group.city && (
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {group.city}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 hidden sm:table-cell">
                        {group.region ? (
                          (REGION_LABELS[group.region] ?? group.region)
                        ) : (
                          <span className="text-neutral-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {group.confirmed > 0 ? (
                          <span className="inline-flex justify-center min-w-6 px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-xs font-bold tabular-nums">
                            {group.confirmed}
                          </span>
                        ) : (
                          <span className="text-neutral-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {group.pending > 0 ? (
                          <span className="inline-flex justify-center min-w-6 px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800/60 text-xs font-bold tabular-nums">
                            {group.pending}
                          </span>
                        ) : (
                          <span className="text-neutral-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {group.cancelled > 0 ? (
                          <span className="text-neutral-500 text-xs tabular-nums font-medium">
                            {group.cancelled}
                          </span>
                        ) : (
                          <span className="text-neutral-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-neutral-200 font-semibold tabular-nums">
                          {group.total}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={href}
                          title="Ver alumnos inscritos"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-800 hover:bg-primary-900/50 text-neutral-500 hover:text-primary-400 border border-neutral-700 hover:border-primary-800 transition-all"
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-neutral-500">
            Página {page} de {totalPages} · {filtered.length} academia
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
