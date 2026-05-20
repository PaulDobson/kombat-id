"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Region data — approximate SVG paths for Chile's 16 regions
// viewBox: 0 0 200 900  (Chile is very tall and narrow)
// Coordinates are simplified polygons, north→south order
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

// Each region: SVG path + label anchor point (cx, cy) for the pin
const REGIONS: Array<{
  id: string;
  path: string;
  cx: number;
  cy: number;
}> = [
  {
    id: "arica_y_parinacota",
    path: "M60,10 L140,10 L145,15 L140,55 L60,55 Z",
    cx: 100,
    cy: 32,
  },
  {
    id: "tarapaca",
    path: "M60,55 L140,55 L145,60 L140,110 L60,110 Z",
    cx: 100,
    cy: 82,
  },
  {
    id: "antofagasta",
    path: "M60,110 L140,110 L145,115 L140,210 L60,210 Z",
    cx: 100,
    cy: 160,
  },
  {
    id: "atacama",
    path: "M62,210 L138,210 L143,215 L138,280 L62,280 Z",
    cx: 100,
    cy: 245,
  },
  {
    id: "coquimbo",
    path: "M64,280 L136,280 L141,285 L136,340 L64,340 Z",
    cx: 100,
    cy: 310,
  },
  {
    id: "valparaiso",
    path: "M66,340 L134,340 L139,345 L134,375 L66,375 Z",
    cx: 100,
    cy: 357,
  },
  {
    id: "metropolitana",
    path: "M68,375 L132,375 L137,380 L132,405 L68,405 Z",
    cx: 100,
    cy: 390,
  },
  {
    id: "ohiggins",
    path: "M68,405 L132,405 L137,410 L132,435 L68,435 Z",
    cx: 100,
    cy: 420,
  },
  {
    id: "maule",
    path: "M68,435 L132,435 L137,440 L132,470 L68,470 Z",
    cx: 100,
    cy: 452,
  },
  {
    id: "nuble",
    path: "M68,470 L132,470 L137,475 L132,495 L68,495 Z",
    cx: 100,
    cy: 482,
  },
  {
    id: "biobio",
    path: "M68,495 L132,495 L137,500 L132,525 L68,525 Z",
    cx: 100,
    cy: 510,
  },
  {
    id: "araucania",
    path: "M68,525 L132,525 L137,530 L132,560 L68,560 Z",
    cx: 100,
    cy: 542,
  },
  {
    id: "los_rios",
    path: "M68,560 L132,560 L137,565 L132,590 L68,590 Z",
    cx: 100,
    cy: 575,
  },
  {
    id: "los_lagos",
    path: "M65,590 L130,590 L135,595 L130,640 L65,640 Z",
    cx: 97,
    cy: 615,
  },
  {
    id: "aysen",
    path: "M60,640 L125,640 L130,645 L125,710 L60,710 Z",
    cx: 92,
    cy: 675,
  },
  {
    id: "magallanes",
    path: "M55,710 L120,710 L125,715 L120,790 L55,790 Z",
    cx: 87,
    cy: 750,
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RegionData {
  region: string;
  count: number;
}

interface Props {
  regionData: RegionData[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChileMap({ regionData }: Props) {
  const [tooltip, setTooltip] = useState<{
    region: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const dataMap = new Map(regionData.map((d) => [d.region, d.count]));
  const maxCount = Math.max(...regionData.map((d) => d.count), 1);

  function getRegionFill(regionId: string, hovered = false) {
    const count = dataMap.get(regionId) ?? 0;
    if (count === 0) return hovered ? "#262626" : "#171717";
    const intensity = count / maxCount;
    if (hovered) {
      if (intensity > 0.75) return "#4338ca"; // indigo-700 brighter
      if (intensity > 0.5) return "#4f46e5"; // indigo-600 brighter
      if (intensity > 0.25) return "#6366f1"; // indigo-500 brighter
      return "#818cf8"; // indigo-400 brighter
    }
    if (intensity > 0.75) return "#3730a3"; // indigo-800
    if (intensity > 0.5) return "#4338ca"; // indigo-700
    if (intensity > 0.25) return "#4f46e5"; // indigo-600
    return "#6366f1"; // indigo-500
  }

  function getRegionOpacity(regionId: string) {
    const count = dataMap.get(regionId) ?? 0;
    return count === 0 ? 0.4 : 1;
  }

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 200 810"
        className="w-full max-w-40"
        style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.7))" }}
        onMouseLeave={() => {
          setTooltip(null);
          setHoveredRegion(null);
        }}
      >
        {REGIONS.map((region) => {
          const count = dataMap.get(region.id) ?? 0;
          const hasData = count > 0;

          return (
            <g key={region.id}>
              {/* Region shape */}
              <path
                d={region.path}
                fill={getRegionFill(region.id, hoveredRegion === region.id)}
                fillOpacity={getRegionOpacity(region.id)}
                stroke={hoveredRegion === region.id ? "#6366f1" : "#2a2a2a"}
                strokeWidth={hoveredRegion === region.id ? "1.5" : "0.6"}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={(e) => {
                  setHoveredRegion(region.id);
                  const svg = (e.target as SVGElement).closest("svg")!;
                  const rect = svg.getBoundingClientRect();
                  setTooltip({
                    region: region.id,
                    count,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onMouseLeave={() => {
                  setTooltip(null);
                  setHoveredRegion(null);
                }}
              />

              {/* Pin para regiones con inscritos */}
              {hasData && (
                <g
                  transform={`translate(${region.cx}, ${region.cy})`}
                  className="pointer-events-none"
                >
                  {/* Glow difuso */}
                  <circle
                    cx="0"
                    cy="0"
                    r="11"
                    fill="#4f46e5"
                    fillOpacity="0.22"
                  />
                  {/* Sombra */}
                  <circle
                    cx="0"
                    cy="1.5"
                    r="7.5"
                    fill="black"
                    fillOpacity="0.5"
                  />
                  {/* Pin */}
                  <circle
                    cx="0"
                    cy="0"
                    r="7.5"
                    fill="#4f46e5"
                    stroke="#a5b4fc"
                    strokeWidth="1.5"
                  />
                  {/* Número */}
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={count >= 10 ? "5" : "6"}
                    fontWeight="700"
                    fill="white"
                    fontFamily="system-ui, sans-serif"
                  >
                    {count}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            transform: tooltip.x > 100 ? "translateX(-110%)" : undefined,
          }}
        >
          <p className="font-semibold text-neutral-100">
            {REGION_LABELS[tooltip.region] ?? tooltip.region}
          </p>
          <p className="text-neutral-400 mt-0.5">
            {tooltip.count} inscrito{tooltip.count !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block" />
          Con inscritos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 inline-block border border-neutral-600" />
          Sin inscritos
        </span>
      </div>
    </div>
  );
}
