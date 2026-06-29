"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { month: string; count: number }[];
}

export function MonthlyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [`${value} ankiet`, "Ankiety"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#1e3a5f"
          strokeWidth={2.5}
          dot={{ fill: "#1e3a5f", r: 4 }}
          activeDot={{ r: 6, fill: "#C9A84C" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
