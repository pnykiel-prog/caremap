import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ZgloszeniaPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; status?: string }>;
}) {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;
  const sp = await searchParams;

  const where: { organizationId: string; careLevel?: number; status?: "DRAFT" | "COMPLETED" | "REPORT_SENT" } = {
    organizationId: orgId,
  };
  if (sp.level) where.careLevel = parseInt(sp.level);
  if (sp.status === "COMPLETED" || sp.status === "DRAFT" || sp.status === "REPORT_SENT") {
    where.status = sp.status;
  }

  const surveys = await prisma.survey.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      senior: { select: { firstName: true, lastName: true, city: true } },
      surveyorEntity: { select: { name: true, type: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Panel JST
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Wszystkie zgłoszenia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pełna lista wypełnionych ankiet z filtrami po poziomie opieki.
        </p>
      </div>

      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Poziom:</span>
            <Link
              href="/panel/zgloszenia"
              className={`px-2 py-1 rounded text-xs ${!sp.level ? "bg-[#1e3a5f] text-white" : "text-[#1e3a5f] hover:bg-gray-100"}`}
            >
              Wszystkie
            </Link>
            {[1, 2, 3, 4, 5, 6, 7].map((l) => (
              <Link
                key={l}
                href={`/panel/zgloszenia?level=${l}`}
                className={`px-2 py-1 rounded text-xs ${sp.level === String(l) ? "bg-[#1e3a5f] text-white" : "text-[#1e3a5f] hover:bg-gray-100"}`}
              >
                {l}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-border">
                <tr>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Senior</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Data</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Miasto</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Źródło</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Poziom</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((s) => {
                  const cfg = s.careLevel
                    ? CARE_LEVELS[s.careLevel as keyof typeof CARE_LEVELS]
                    : null;
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-[#F8FAFC]">
                      <td className="p-3 font-medium text-[#1e3a5f]">
                        {s.senior.firstName} {s.senior.lastName}
                      </td>
                      <td className="p-3 text-muted-foreground">{fmt(s.createdAt)}</td>
                      <td className="p-3 text-muted-foreground">{s.senior.city ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {s.surveyorEntity ? s.surveyorEntity.name : "Gmina"}
                      </td>
                      <td className="p-3">
                        {cfg && s.careLevel ? (
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-full"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            P. {s.careLevel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/ankieta/${s.id}/wyniki`}
                          className="flex items-center gap-1 text-[#1e3a5f] text-xs hover:underline"
                        >
                          otwórz <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {surveys.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      Brak zgłoszeń pasujących do filtrów.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
