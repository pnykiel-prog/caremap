import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { ChevronLeft, FileDown } from "lucide-react";

export default async function RaportPage() {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const [seniorCount, surveyCount, alertCount, dist] = await Promise.all([
    prisma.senior.count({ where: { organizationId: orgId } }),
    prisma.survey.count({ where: { organizationId: orgId, status: "COMPLETED" } }),
    prisma.alert.count({ where: { organizationId: orgId, status: "OPEN" } }),
    prisma.survey.groupBy({
      by: ["careLevel"],
      where: { organizationId: orgId, status: "COMPLETED", careLevel: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const distMap: Record<number, number> = {};
  for (const d of dist) {
    if (d.careLevel != null) distMap[d.careLevel] = d._count._all;
  }

  return (
    <div className="space-y-5">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Panel JST
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Raport zbiorczy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Podsumowanie do dokumentacji JST i wniosków o dofinansowanie (M2-02).
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 h-10 bg-[#1e3a5f] hover:bg-[#152b47] text-white rounded-md text-sm opacity-50 cursor-not-allowed"
          title="Eksport PDF — backlog M2-02"
          disabled
        >
          <FileDown size={14} /> Eksport PDF (planowane)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Zarejestrowani seniorzy", value: seniorCount },
          { label: "Ukończone ankiety", value: surveyCount },
          { label: "Otwarte alerty (poziom 6-7)", value: alertCount },
        ].map((s) => (
          <Card key={s.label} className="bg-white">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-4">Rozkład poziomu opieki</p>
          <div className="space-y-2">
            {([1, 2, 3, 4, 5, 6, 7] as const).map((level) => {
              const cfg = CARE_LEVELS[level];
              const count = distMap[level] ?? 0;
              const max = Math.max(...Object.values(distMap), 1);
              const pct = (count / max) * 100;
              return (
                <div key={level} className="flex items-center gap-3 text-sm">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full w-16 text-center"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    P. {level}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: cfg.color }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#1e3a5f] w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
