"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CARE_LEVELS } from "@/lib/survey-algorithm";

interface Props {
  data: { level: number; count: number }[];
}

export function CareLevelChart({ data }: Props) {
  const chartData = data
    .filter((d) => d.count > 0 || true)
    .map((d) => ({
      name: `Poziom ${d.level}`,
      count: d.count,
      color: CARE_LEVELS[d.level as keyof typeof CARE_LEVELS]?.color ?? "#94a3b8",
      label: CARE_LEVELS[d.level as keyof typeof CARE_LEVELS]?.label ?? "",
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip
          formatter={(value, _name, props) => [
            `${value} ankiet`,
            props.payload?.label ?? "",
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
