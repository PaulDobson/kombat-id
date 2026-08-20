"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
} from "recharts";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegionalDataPoint {
  region: string;
  label: string;
  shortLabel: string;
  academies: number;
  practitioners: number;
  total: number;
}

interface Props {
  data: RegionalDataPoint[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Intensity scale: returns a color opacity based on how "hot" a region is
// relative to the max. Useful for the visual heatmap feeling.
function getBarIntensity(value: number, max: number): number {
  if (max === 0) return 0.4;
  return 0.35 + (value / max) * 0.65;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const academies = payload.find((p) => p.name === "Academias")?.value ?? 0;
  const practitioners =
    payload.find((p) => p.name === "Alumnos")?.value ?? 0;
  const total = academies + practitioners;
  const avgPerAcademy =
    academies > 0 ? (practitioners / academies).toFixed(1) : "—";

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 shadow-xl min-w-[180px]">
      <p className="text-xs font-semibold text-neutral-200 mb-2.5">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" />
            Academias
          </span>
          <span className="text-xs font-semibold text-blue-400 tabular-nums">
            {academies}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-sm bg-emerald-500 shrink-0" />
            Alumnos
          </span>
          <span className="text-xs font-semibold text-emerald-400 tabular-nums">
            {practitioners}
          </span>
        </div>
        <div className="border-t border-neutral-800 pt-1.5 mt-1.5 flex items-center justify-between gap-6">
          <span className="text-xs text-neutral-500">Alumnos/academia</span>
          <span className="text-xs font-semibold text-neutral-300 tabular-nums">
            {avgPerAcademy}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-neutral-500">Total entidades</span>
          <span className="text-xs font-semibold text-neutral-200 tabular-nums">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RegionalConcentrationChart({ data }: Props) {
  const [sortBy, setSortBy] = useState<"practitioners" | "academies" | "total">(
    "practitioners",
  );

  const sorted = [...data].sort((a, b) => b[sortBy] - a[sortBy]);

  const maxPractitioners = Math.max(...sorted.map((d) => d.practitioners), 1);
  const maxAcademies = Math.max(...sorted.map((d) => d.academies), 1);

  // Summary stats
  const topRegion = sorted[0];
  const totalAcademies = data.reduce((s, d) => s + d.academies, 0);
  const totalPractitioners = data.reduce((s, d) => s + d.practitioners, 0);
  const regionsWithData = data.filter((d) => d.practitioners > 0).length;

  return (
    <div className="space-y-5">
      {/* ── Summary strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-blue-400 tabular-nums">
            {totalAcademies}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">Academias</p>
        </div>
        <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-emerald-400 tabular-nums">
            {totalPractitioners}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">Alumnos</p>
        </div>
        <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-neutral-200 tabular-nums">
            {regionsWithData}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">Regiones activas</p>
        </div>
      </div>

      {/* ── Sort controls ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {topRegion ? (
            <>
              Mayor concentración:{" "}
              <span className="text-neutral-300 font-medium">
                {topRegion.label}
              </span>
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1">
          {(
            [
              { key: "practitioners", label: "Alumnos" },
              { key: "academies", label: "Academias" },
              { key: "total", label: "Total" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                sortBy === key
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ─────────────────────────────────────────────────────────── */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={sorted}
            margin={{ top: 8, right: 6, left: -18, bottom: 0 }}
            barGap={2}
            barCategoryGap="28%"
          >
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: "#a3a3a3", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={58}
            />
            {/* Left axis: practitioners */}
            <YAxis
              yAxisId="practitioners"
              orientation="left"
              allowDecimals={false}
              tick={{ fill: "#737373", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            {/* Right axis: academies */}
            <YAxis
              yAxisId="academies"
              orientation="right"
              allowDecimals={false}
              tick={{ fill: "#737373", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              content={
                <CustomTooltip />
              }
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", color: "#a3a3a3", paddingBottom: "4px" }}
            />

            {/* Practitioners bars — primary, taller axis */}
            <Bar
              yAxisId="practitioners"
              dataKey="practitioners"
              name="Alumnos"
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            >
              {sorted.map((entry) => (
                <Cell
                  key={entry.region}
                  fill={`rgba(16, 185, 129, ${getBarIntensity(entry.practitioners, maxPractitioners)})`}
                  stroke="rgba(16, 185, 129, 0.3)"
                  strokeWidth={1}
                />
              ))}
              <LabelList
                dataKey="practitioners"
                position="top"
                style={{ fill: "#6ee7b7", fontSize: 9, fontWeight: 600 }}
              />
            </Bar>

            {/* Academies bars — secondary, shorter axis */}
            <Bar
              yAxisId="academies"
              dataKey="academies"
              name="Academias"
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            >
              {sorted.map((entry) => (
                <Cell
                  key={entry.region}
                  fill={`rgba(59, 130, 246, ${getBarIntensity(entry.academies, maxAcademies)})`}
                  stroke="rgba(59, 130, 246, 0.3)"
                  strokeWidth={1}
                />
              ))}
              <LabelList
                dataKey="academies"
                position="top"
                style={{ fill: "#93c5fd", fontSize: 9, fontWeight: 600 }}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Ranking table ─────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Ranking por {sortBy === "practitioners" ? "alumnos" : sortBy === "academies" ? "academias" : "total"}
        </p>
        <div className="space-y-1">
          {sorted.slice(0, 5).map((d, i) => {
            const pct =
              sortBy === "practitioners"
                ? (d.practitioners / Math.max(sorted[0]?.practitioners ?? 1, 1)) * 100
                : sortBy === "academies"
                  ? (d.academies / Math.max(sorted[0]?.academies ?? 1, 1)) * 100
                  : (d.total / Math.max(sorted[0]?.total ?? 1, 1)) * 100;

            return (
              <div key={d.region} className="flex items-center gap-3">
                <span className="w-4 text-xs text-neutral-600 tabular-nums text-right shrink-0">
                  {i + 1}
                </span>
                <span className="w-24 text-xs text-neutral-300 truncate shrink-0">
                  {d.label}
                </span>
                {/* Progress bar */}
                <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sortBy === "academies" ? "bg-blue-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-emerald-400 tabular-nums w-8 text-right">
                    {d.practitioners}
                  </span>
                  <span className="text-neutral-700 text-xs">·</span>
                  <span className="text-xs text-blue-400 tabular-nums w-5 text-right">
                    {d.academies}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {sorted.length > 5 && (
          <p className="text-xs text-neutral-600 pt-1">
            + {sorted.length - 5} región{sorted.length - 5 !== 1 ? "es" : ""} más
          </p>
        )}
        {/* Legend for ranking columns */}
        <div className="flex items-center gap-4 pt-1">
          <span className="flex items-center gap-1 text-xs text-neutral-600">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" />
            Alumnos
          </span>
          <span className="flex items-center gap-1 text-xs text-neutral-600">
            <span className="w-2 h-2 rounded-sm bg-blue-500" />
            Academias
          </span>
        </div>
      </div>
    </div>
  );
}
