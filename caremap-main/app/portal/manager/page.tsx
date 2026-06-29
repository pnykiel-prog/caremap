import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { CARE_LEVELS } from "@/lib/survey-algorithm";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function ManagerDashboard() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE", role: "ENTITY_MANAGER" },
    select: { entityId: true },
  });
  const entityId = membership!.entityId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [patientCount, surveyorCount, monthSurveys, openAlerts, recentSurveys] = await Promise.all([
    prisma.patientAssignment.count({ where: { entityId, isActive: true } }),
    prisma.surveyorMembership.count({
      where: { entityId, status: "ACTIVE", role: "ENTITY_SURVEYOR" },
    }),
    prisma.survey.count({
      where: { surveyorEntityId: entityId, createdAt: { gte: monthStart } },
    }),
    prisma.alert.count({
      where: {
        survey: { surveyorEntityId: entityId },
        status: "OPEN",
      },
    }),
    prisma.survey.findMany({
      where: { surveyorEntityId: entityId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { senior: true },
    }),
  ]);

  const stats = [
    { label: "Pacjenci", value: patientCount, icon: Users, hint: "Aktywne przypisania" },
    {
      label: "Pracownicy",
      value: surveyorCount,
      icon: ClipboardList,
      hint: "Ankieterzy w podmiocie",
    },
    {
      label: "Ankiety w tym miesiącu",
      value: monthSurveys,
      icon: TrendingUp,
      hint: fmt(monthStart),
    },
    {
      label: "Otwarte alerty",
      value: openAlerts,
      icon: AlertTriangle,
      hint: "Poziom opieki 6-7",
      accent: openAlerts > 0,
    },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Dashboard podmiotu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Witaj, {session?.user?.name?.split(" ")[0]}. Oto przegląd aktywności Twojego podmiotu.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      s.accent ? "bg-[#C9A84C]/10" : "bg-[#1e3a5f]/10"
                    }`}
                  >
                    <Icon size={14} className={s.accent ? "text-[#C9A84C]" : "text-[#1e3a5f]"} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#1e3a5f]">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{s.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#1e3a5f]">Ostatnie ankiety podmiotu</p>
            <Link
              href="/portal/manager/pacjenci"
              className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-1"
            >
              Wszyscy pacjenci <ArrowRight size={12} />
            </Link>
          </div>
          {recentSurveys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Brak ankiet w podmiocie. Zaproś pracowników i zacznijcie wypełniać badania.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentSurveys.map((s) => {
                const cfg = s.careLevel
                  ? CARE_LEVELS[s.careLevel as keyof typeof CARE_LEVELS]
                  : null;
                return (
                  <Link
                    key={s.id}
                    href={`/ankieta/${s.id}/wyniki`}
                    className="flex items-center justify-between py-3 hover:bg-[#F8FAFC] -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[#1e3a5f]">
                          {s.senior.firstName[0]}
                          {s.senior.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1e3a5f] truncate">
                          {s.senior.firstName} {s.senior.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar size={11} />
                          {fmt(s.createdAt)}
                        </p>
                      </div>
                    </div>
                    {cfg && (
                      <span
                        className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        P. {s.careLevel}
                      </span>
                    )}
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
