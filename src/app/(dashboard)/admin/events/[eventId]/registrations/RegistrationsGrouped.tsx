"use client";

import { useState } from "react";
import { ChileMap } from "./ChileMap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistrationRow {
  id: string;
  practitionerName: string;
  instructorName: string;
  status: string;
  registeredAt: string;
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
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function regionIcon(_region: string | null) {
  // Simple pin icon — no external dependency needed
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"
      />
      <circle cx="12" cy="8" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Group registrations by academy
// ---------------------------------------------------------------------------

interface AcademyGroup {
  academyId: string | null;
  academyName: string;
  city: string | null;
  region: string | null;
  registrations: RegistrationRow[];
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
        registrations: [],
      });
    }
    map.get(key)!.registrations.push(reg);
  }

  // Sort: academies with most registrations first; "Sin academia" last
  return Array.from(map.values()).sort((a, b) => {
    if (a.academyId === null) return 1;
    if (b.academyId === null) return -1;
    return b.registrations.length - a.registrations.length;
  });
}

// ---------------------------------------------------------------------------
// Academy card
// ---------------------------------------------------------------------------

function AcademyCard({ group }: { group: AcademyGroup }) {
  const [open, setOpen] = useState(true);

  const confirmed = group.registrations.filter(
    (r) => r.status === "confirmada",
  ).length;
  const pending = group.registrations.filter(
    (r) => r.status === "pendiente_pago",
  ).length;
  const cancelled = group.registrations.filter(
    (r) => r.status === "cancelada",
  ).length;
  const active = confirmed + pending;

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
      {/* Academy header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 hover:bg-neutral-800/40 transition-colors text-left"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-100 truncate">
              {group.academyName}
            </h3>
            {/* Active count badge */}
            <span className="inline-flex items-center gap-1 bg-primary-900/50 text-primary-400 border border-primary-800 px-2 py-0.5 rounded-full text-xs font-medium tabular-nums">
              {active} {active === 1 ? "inscrito" : "inscritos"}
            </span>
            {cancelled > 0 && (
              <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-500 border border-neutral-700 px-2 py-0.5 rounded-full text-xs tabular-nums">
                {cancelled} cancelado{cancelled !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Geographic info */}
          {(group.city || group.region) && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              {regionIcon(group.region)}
              <span>
                {[
                  group.city,
                  group.region
                    ? (REGION_LABELS[group.region] ?? group.region)
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          {/* Mini status breakdown */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {confirmed > 0 && (
              <span
                className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLES.confirmada}`}
              >
                {confirmed} confirmada{confirmed !== 1 ? "s" : ""}
              </span>
            )}
            {pending > 0 && (
              <span
                className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLES.pendiente_pago}`}
              >
                {pending} pendiente{pending !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-neutral-500 shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Registrations table */}
      {open && (
        <div className="border-t border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-800/40">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Alumno
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                  Instructor
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                  Inscrito el
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {group.registrations.map((reg) => (
                <tr
                  key={reg.id}
                  className="hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="px-5 py-3 text-neutral-100 font-medium">
                    {reg.practitionerName || "—"}
                  </td>
                  <td className="px-5 py-3 text-neutral-400 text-xs hidden sm:table-cell">
                    {reg.instructorName || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[reg.status] ?? STATUS_STYLES.cancelada}`}
                    >
                      {STATUS_LABELS[reg.status] ?? reg.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-neutral-500 text-xs tabular-nums hidden md:table-cell">
                    {formatDate(reg.registeredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RegistrationsGrouped({ registrations }: Props) {
  const groups = groupByAcademy(registrations);
  const academiesWithRegistrations = groups.filter((g) => g.academyId !== null);
  const totalActive = registrations.filter(
    (r) => r.status !== "cancelada",
  ).length;

  // Build region data for the map
  const regionCountMap = new Map<string, number>();
  for (const group of groups) {
    if (!group.region) continue;
    const active = group.registrations.filter(
      (r) => r.status !== "cancelada",
    ).length;
    regionCountMap.set(
      group.region,
      (regionCountMap.get(group.region) ?? 0) + active,
    );
  }
  const regionData = Array.from(regionCountMap.entries()).map(
    ([region, count]) => ({ region, count }),
  );

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
      {/* Summary: map + stats side by side */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 flex flex-col sm:flex-row gap-6">
        {/* Map */}
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          <ChileMap regionData={regionData} />
        </div>

        {/* Stats + region pills */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-800 rounded-xl px-4 py-3 flex flex-col gap-0.5">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                Total inscritos
              </span>
              <span className="text-2xl font-bold text-neutral-50 tabular-nums">
                {totalActive}
              </span>
            </div>
            <div className="bg-neutral-800 rounded-xl px-4 py-3 flex flex-col gap-0.5">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                Academias
              </span>
              <span className="text-2xl font-bold text-neutral-50 tabular-nums">
                {academiesWithRegistrations.length}
              </span>
            </div>
            <div className="bg-neutral-800 rounded-xl px-4 py-3 flex flex-col gap-0.5">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                Regiones
              </span>
              <span className="text-2xl font-bold text-neutral-50 tabular-nums">
                {new Set(groups.map((g) => g.region).filter(Boolean)).size}
              </span>
            </div>
          </div>

          {/* Region pills */}
          {academiesWithRegistrations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(regionCountMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([region, count]) => (
                  <div
                    key={region}
                    className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-full px-3 py-1"
                  >
                    {regionIcon(region)}
                    <span className="text-xs text-neutral-300">
                      {REGION_LABELS[region] ?? region}
                    </span>
                    <span className="text-xs font-semibold text-neutral-100 tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Academy groups */}
      <div className="space-y-3">
        {groups.map((group) => (
          <AcademyCard
            key={group.academyId ?? "__sin_academia__"}
            group={group}
          />
        ))}
      </div>
    </div>
  );
}
