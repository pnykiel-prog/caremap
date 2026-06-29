"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { CARE_LEVELS, LEVEL_PROVIDER_TYPES } from "@/lib/survey-algorithm";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import SurveyTrendChart from "./SurveyTrendChart";
import type { TrendPoint } from "@/lib/survey-types";

interface Props {
  survey: {
    id: string;
    k1Score: number | null;
    k2Score: number | null;
    k3Score: number | null;
    k4Score: number | null;
    careLevel: number | null;
    completedAt: string | null;
  };
  senior: {
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    city: string | null;
  };
  mapId?: string;
  surveyCount?: number;
  surveyIndex?: number;
  history?: TrendPoint[];
}

export function SurveyResults({ survey, senior, mapId, surveyCount, surveyIndex, history }: Props) {
  const level = survey.careLevel ?? 3;
  const levelCfg = CARE_LEVELS[level as keyof typeof CARE_LEVELS];
  const providerTypes = LEVEL_PROVIDER_TYPES[level] ?? [];

  const radarData = [
    { subject: "K1\nSytuacja życiowa", value: survey.k1Score ?? 0, fullMark: 100 },
    { subject: "K2\nSamodzielność", value: survey.k2Score ?? 0, fullMark: 100 },
    { subject: "K3\nPoza domem", value: survey.k3Score ?? 0, fullMark: 100 },
    { subject: "K4\nBezpieczeństwo", value: survey.k4Score ?? 0, fullMark: 100 },
  ];

  const scores = [
    { code: "K1", label: "Sytuacja życiowa i wsparcie", value: survey.k1Score ?? 0 },
    { code: "K2", label: "Samodzielność (ADL + orientacja)", value: survey.k2Score ?? 0 },
    { code: "K3", label: "Funkcjonowanie poza domem", value: survey.k3Score ?? 0 },
    { code: "K4", label: "Bezpieczeństwo i dostosowanie domu", value: survey.k4Score ?? 0 },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Care level badge */}
      <div
        className="rounded-xl p-6 text-center border-2"
        style={{ borderColor: levelCfg.color, backgroundColor: levelCfg.bg }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: levelCfg.color }}>
          Poziom opieki
        </p>
        <p className="text-5xl font-black mb-2" style={{ color: levelCfg.color }}>
          {level}
        </p>
        <p className="text-lg font-semibold" style={{ color: levelCfg.color }}>
          {levelCfg.label}
        </p>
        <p className="text-sm mt-2 text-gray-600">
          {senior.firstName} {senior.lastName}
          {senior.dateOfBirth ? ` · ur. ${new Date(senior.dateOfBirth).toLocaleDateString("pl-PL")}` : ""}
          {senior.city ? ` · ${senior.city}` : ""}
        </p>
        {surveyCount && surveyCount > 1 && (
          <p className="text-xs mt-1 font-medium" style={{ color: levelCfg.color }}>
            Ankieta {surveyIndex ?? surveyCount} z {surveyCount} dla tej osoby
          </p>
        )}
        {level >= 6 && (
          <div className="mt-3 text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-4 py-2">
            ⚠ Alert — wymagana pilna interwencja
          </div>
        )}
      </div>

      {/* Radar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[#1e3a5f] mb-4">Profil funkcjonowania</h3>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Radar
              name="Wynik"
              dataKey="value"
              stroke="#1e3a5f"
              fill="#1e3a5f"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip formatter={(v) => [`${v}%`, "Wynik"]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score bars */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-[#1e3a5f]">Wyniki szczegółowe</h3>
        {scores.map((s) => (
          <div key={s.code} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>
                <span className="font-semibold text-[#1e3a5f] mr-2">{s.code}</span>
                <span className="text-muted-foreground">{s.label}</span>
              </span>
              <span className="font-semibold text-[#1e3a5f]">{s.value}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${s.value}%`, backgroundColor: levelCfg.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {history && <SurveyTrendChart history={history} />}

      {/* Recommended provider types */}
      {providerTypes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3">Rekomendowane formy wsparcia</h3>
          <div className="space-y-2">
            {providerTypes.map((type, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />
                {type}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/ankieta/${survey.id}/ponow`}
          className={cn(buttonVariants({ variant: "outline" }), "flex-1 gap-2")}
        >
          <RotateCcw size={16} />
          Wypełnij ponownie ankietę dla tej osoby
        </Link>
        {mapId ? (
          <button
            onClick={() =>
              document.getElementById(mapId)?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className={cn(buttonVariants({ variant: "default" }), "flex-1 gap-2 bg-[#1e3a5f] hover:bg-[#152b47] text-white")}
          >
            Dopasuj podmiot
            <ArrowRight size={16} />
          </button>
        ) : (
          <Link
            href="/podmioty"
            className={cn(buttonVariants({ variant: "default" }), "flex-1 gap-2 bg-[#1e3a5f] hover:bg-[#152b47] text-white")}
          >
            Dopasuj podmiot
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
