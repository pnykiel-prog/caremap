"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import type { TrendPoint } from "@/lib/survey-types";

export type { TrendPoint };

interface Props {
  history: TrendPoint[];
}

const LINES = [
  { key: "k1", label: "K1 Sytuacja życiowa", color: "#1e3a5f" },
  { key: "k2", label: "K2 Samodzielność",    color: "#16a34a" },
  { key: "k3", label: "K3 Poza domem",       color: "#d97706" },
  { key: "k4", label: "K4 Bezpieczeństwo",   color: "#dc2626" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as TrendPoint;
  const levelCfg = point.level ? CARE_LEVELS[point.level as keyof typeof CARE_LEVELS] : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-semibold text-gray-700 mb-2">{point.dateFull}</p>
      {LINES.map((l) => {
        const val = point[l.key];
        return val !== null ? (
          <div key={l.key} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
            <span className="font-semibold" style={{ color: l.color }}>{val}%</span>
          </div>
        ) : null;
      })}
      {levelCfg && point.level && (
        <div
          className="mt-2 pt-2 border-t border-gray-100 text-xs font-semibold text-center rounded-lg px-2 py-0.5"
          style={{ color: levelCfg.color, background: levelCfg.bg }}
        >
          Poziom opieki: {point.level} — {levelCfg.label}
        </div>
      )}
    </div>
  );
}

export default function SurveyTrendChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[#1e3a5f] mb-1">Zmiany w czasie — K1–K4</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Wykres pojawi się po wypełnieniu co najmniej dwóch ankiet dla tej osoby.
        </p>
        <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-xs text-gray-400">Brak historii do wyświetlenia</p>
        </div>
      </div>
    );
  }

  // Compute delta for last two surveys
  const last  = history[history.length - 1];
  const prev  = history[history.length - 2];
  const delta = {
    k1: last.k1 !== null && prev.k1 !== null ? last.k1 - prev.k1 : null,
    k2: last.k2 !== null && prev.k2 !== null ? last.k2 - prev.k2 : null,
    k3: last.k3 !== null && prev.k3 !== null ? last.k3 - prev.k3 : null,
    k4: last.k4 !== null && prev.k4 !== null ? last.k4 - prev.k4 : null,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#1e3a5f]">Zmiany w czasie — K1–K4</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {history.length} {history.length === 1 ? "ankieta" : history.length <= 4 ? "ankiety" : "ankiet"}
            {" · "}od {history[0].dateFull} do {last.dateFull}
          </p>
        </div>

        {/* Delta badges (last vs previous) */}
        <div className="flex flex-wrap gap-1.5">
          {LINES.map((l) => {
            const d = delta[l.key];
            if (d === null) return null;
            const sign  = d > 0 ? "+" : "";
            const color = d > 0 ? "#16a34a" : d < 0 ? "#dc2626" : "#94a3b8";
            const bg    = d > 0 ? "#dcfce7" : d < 0 ? "#fee2e2" : "#f1f5f9";
            return (
              <span key={l.key} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>
                {l.key.toUpperCase()} {sign}{d}%
              </span>
            );
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
            formatter={(value) => <span style={{ color: "#374151" }}>{value}</span>}
          />
          {LINES.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={2}
              dot={{ r: 4, fill: l.color, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Level timeline */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        <span className="text-xs text-gray-400 flex-shrink-0 mr-1">Poziom:</span>
        {history.map((h, i) => {
          const cfg = h.level ? CARE_LEVELS[h.level as keyof typeof CARE_LEVELS] : null;
          return (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              {cfg && h.level ? (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: cfg.color, background: cfg.bg }}
                  title={h.dateFull}
                >
                  {h.level}
                </span>
              ) : (
                <span className="text-xs text-gray-300 px-2 py-0.5 rounded-full bg-gray-100">—</span>
              )}
              {i < history.length - 1 && (
                <span className="text-gray-300 text-xs">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
