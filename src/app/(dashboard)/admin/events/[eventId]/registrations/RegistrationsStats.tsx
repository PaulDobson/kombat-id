"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  statusCounts: {
    confirmada: number;
    pendiente_pago: number;
    cancelada: number;
  };
  totalRegistrations: number;
  maxParticipants: number | null;
  confirmedCount: number;
};

const TOOLTIP_STYLE = {
  background: "#171717",
  border: "1px solid #404040",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#e5e5e5",
};

export function RegistrationsStats({
  statusCounts,
  totalRegistrations,
  maxParticipants,
  confirmedCount,
}: Props) {
  const afoPercent =
    maxParticipants != null
      ? Math.min((confirmedCount / maxParticipants) * 100, 100)
      : 0;
  const afoIsFull =
    maxParticipants != null && confirmedCount >= maxParticipants;

  // Donut chart — distribución de estados
  const pieData = [
    {
      name: "Confirmadas",
      value: statusCounts.confirmada,
      color: "#10b981",
    },
    {
      name: "Pendientes",
      value: statusCounts.pendiente_pago,
      color: "#f59e0b",
    },
    {
      name: "Canceladas",
      value: statusCounts.cancelada,
      color: "#525252",
    },
  ].filter((d) => d.value > 0);

  const hasDistributionData = totalRegistrations > 0;

  // Gauge chart — capacidad (arco de 240°)
  const gaugeColor = afoIsFull
    ? "#ef4444"
    : afoPercent > 80
      ? "#f59e0b"
      : "#10b981";

  const gaugeData = [
    { name: "Ocupado", value: afoPercent },
    { name: "Libre", value: 100 - afoPercent },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Distribución de estados */}
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl p-5">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
          Distribución de inscripciones
        </p>
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative w-32 h-32 shrink-0">
            {hasDistributionData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => [v ?? "", ""]}
                    separator=""
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-29 h-29 rounded-full border-10 border-neutral-800" />
              </div>
            )}
            {/* Total en el centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-neutral-50 tabular-nums leading-none">
                {totalRegistrations}
              </span>
              <span className="text-[10px] text-neutral-500 mt-0.5">total</span>
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs text-neutral-400">Confirmadas</span>
              </div>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {statusCounts.confirmada}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs text-neutral-400">Pendientes</span>
              </div>
              <span className="text-sm font-bold text-amber-400 tabular-nums">
                {statusCounts.pendiente_pago}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-600 shrink-0" />
                <span className="text-xs text-neutral-400">Canceladas</span>
              </div>
              <span className="text-sm font-bold text-neutral-400 tabular-nums">
                {statusCounts.cancelada}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capacidad del evento */}
      {maxParticipants != null ? (
        <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Capacidad del evento
          </p>
          <div className="flex items-center gap-6">
            {/* Gauge (arco parcial) */}
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Pista de fondo */}
                  <Pie
                    data={[{ value: 1 }]}
                    cx="50%"
                    cy="50%"
                    startAngle={210}
                    endAngle={-30}
                    innerRadius={38}
                    outerRadius={58}
                    dataKey="value"
                    strokeWidth={0}
                    fill="#262626"
                    isAnimationActive={false}
                  />
                  {/* Valor real */}
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="50%"
                    startAngle={210}
                    endAngle={-30}
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={0}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill={gaugeColor} />
                    <Cell fill="transparent" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Porcentaje en el centro */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className={`text-2xl font-bold tabular-nums leading-none ${
                    afoIsFull
                      ? "text-red-400"
                      : afoPercent > 80
                        ? "text-amber-400"
                        : "text-neutral-50"
                  }`}
                >
                  {Math.round(afoPercent)}%
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">
                  aforo
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3 flex-1">
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Confirmados</p>
                <p className="text-lg font-bold text-neutral-100 tabular-nums leading-none">
                  {confirmedCount}
                  <span className="text-sm font-normal text-neutral-500">
                    {" "}
                    / {maxParticipants}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Disponibles</p>
                <p
                  className={`text-lg font-bold tabular-nums leading-none ${
                    afoIsFull ? "text-red-400" : "text-neutral-100"
                  }`}
                >
                  {afoIsFull
                    ? "Aforo completo"
                    : maxParticipants - confirmedCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl p-5 flex items-center justify-center">
          <p className="text-sm text-neutral-600">Sin límite de aforo</p>
        </div>
      )}
    </div>
  );
}
