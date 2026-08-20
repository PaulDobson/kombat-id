"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RegionDataPoint {
  region: string;
  label: string;
  count: number;
}

// One accent colour per bar — cycles through a palette for any number of regions
const REGION_PALETTE = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#84cc16", // lime
  "#facc15", // yellow
  "#f97316", // orange
  "#f43f5e", // rose
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#22c55e", // green
  "#ef4444", // red
  "#0ea5e9", // sky
  "#f59e0b", // amber
];

export function RegionChart({ data }: { data: RegionDataPoint[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%" minHeight={224}>
        <BarChart
          data={sorted}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "#a3a3a3", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={54}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#737373", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#171717",
              border: "1px solid #404040",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#fafafa",
            }}
            itemStyle={{
              color: "#fafafa",
            }}
            formatter={(value) => [
              typeof value === "number" ? value : 0,
              "Academias",
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {sorted.map((entry, index) => {
              const fill =
                REGION_PALETTE[index % REGION_PALETTE.length] ??
                REGION_PALETTE[0] ??
                "#6366f1";

              return <Cell key={entry.region} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
