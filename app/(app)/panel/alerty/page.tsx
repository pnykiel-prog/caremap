import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Otwarty", cls: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "W realizacji", cls: "bg-orange-100 text-orange-700" },
  RESOLVED: { label: "Rozwiązany", cls: "bg-green-100 text-green-700" },
};

export default async function AlertyPage() {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const alerts = await prisma.alert.findMany({
    where: { organizationId: orgId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { survey: { include: { senior: true } } },
    take: 100,
  });

  const open = alerts.filter((a) => a.status === "OPEN");
  const inProg = alerts.filter((a) => a.status === "IN_PROGRESS");
  const resolved = alerts.filter((a) => a.status === "RESOLVED");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/panel"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
        >
          <ChevronLeft size={14} /> Panel JST
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Alerty</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wszystkie alerty wygenerowane przy wykryciu poziomu opieki 6-7.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Otwarte", val: open.length, color: "text-red-600" },
          { label: "W realizacji", val: inProg.length, color: "text-orange-600" },
          { label: "Rozwiązane", val: resolved.length, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label} className="bg-white">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white overflow-hidden">
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="p-10 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Brak alertów.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((a) => {
                const cfg = CARE_LEVELS[a.careLevel as keyof typeof CARE_LEVELS];
                const sCfg = STATUS_LABEL[a.status];
                return (
                  <Link
                    key={a.id}
                    href={`/ankieta/${a.surveyId}/wyniki`}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg }}
                      >
                        <AlertTriangle size={16} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1e3a5f] truncate">
                          {a.survey.senior.firstName} {a.survey.senior.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Poziom {a.careLevel} · zgłoszono {fmt(a.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${sCfg.cls}`}>
                        {sCfg.label}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
