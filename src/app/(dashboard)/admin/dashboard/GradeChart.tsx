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

interface GradeDataPoint {
  grade: string;
  label: string;
  count: number;
}

const GRADE_COLORS: Record<string, string> = {
  white: "#e5e5e5",
  yellow: "#facc15",
  green: "#10b981",
  blue: "#3b82f6",
  red: "#f43f5e",
  black: "#a3a3a3",
};

const GRADE_ORDER = ["white", "yellow", "green", "blue", "red", "black"];

export function GradeChart({ data }: { data: GradeDataPoint[] }) {
  const sorted = [...data].sort(
    (a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade),
  );

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "#a3a3a3", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
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
            formatter={(value) => [
              typeof value === "number" ? value : 0,
              "Practicantes",
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {sorted.map((entry) => (
              <Cell
                key={entry.grade}
                fill={GRADE_COLORS[entry.grade] ?? "#6366f1"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
