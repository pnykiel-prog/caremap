import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, ClipboardList, AlertTriangle, TrendingUp, Clock, ArrowRight, Map } from "lucide-react";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { CareLevelChart } from "@/components/dashboard/CareLevelChart";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { AlertPanel } from "@/components/dashboard/AlertPanel";
import { formatDate } from "@/lib/utils";
import MapPanelClient from "@/components/dashboard/MapPanelClient";

export default async function PanelJSTPage() {
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string })?.organizationId!;

  const [seniorCount, surveyCount, completedCount, openAlertCount] = await Promise.all([
    prisma.senior.count({ where: { organizationId: orgId } }),
    prisma.survey.count({ where: { organizationId: orgId } }),
    prisma.survey.count({ where: { organizationId: orgId, status: "COMPLETED" } }),
    prisma.alert.count({ where: { organizationId: orgId, status: "OPEN" } }),
  ]);

  const completionRate = surveyCount > 0 ? Math.round((completedCount / surveyCount) * 100) : 0;

  // Care level distribution
  const completedSurveys = await prisma.survey.findMany({
    where: { organizationId: orgId, status: "COMPLETED", careLevel: { not: null } },
    select: { careLevel: true, createdAt: true },
  });

  const careLevelDist = [1, 2, 3, 4, 5, 6, 7].map((level) => ({
    level,
    count: completedSurveys.filter((s) => s.careLevel === level).length,
  }));

  // Monthly data — last 6 months
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
    return {
      month: d.toLocaleDateString("pl-PL", { month: "short" }),
      count: completedSurveys.filter((s) => s.createdAt >= d && s.createdAt < next).length,
    };
  });

  // Alerts
  const alerts = await prisma.alert.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const surveyIds = [...new Set(alerts.map((a) => a.surveyId))];
  const surveysForAlerts = await prisma.survey.findMany({ where: { id: { in: surveyIds } }, select: { id: true, seniorId: true } });
  const seniorIds = [...new Set(surveysForAlerts.map((s) => s.seniorId))];
  const seniorsForAlerts = await prisma.senior.findMany({ where: { id: { in: seniorIds } }, select: { id: true, firstName: true, lastName: true } });
  const seniorById = Object.fromEntries(seniorsForAlerts.map((s) => [s.id, s]));
  const seniorBySurvey = Object.fromEntries(surveysForAlerts.map((s) => [s.id, seniorById[s.seniorId]]));

  // Recent surveys
  const recentSurveys = await prisma.survey.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, seniorId: true, status: true, careLevel: true, createdAt: true },
  });
  const recentSeniorIds = [...new Set(recentSurveys.map((s) => s.seniorId))];
  const recentSeniors = await prisma.senior.findMany({
    where: { id: { in: recentSeniorIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const recentSeniorById = Object.fromEntries(recentSeniors.map((s) => [s.id, s]));

  const kpiCards = [
    { title: "Seniorzy", value: seniorCount, icon: Users, desc: "Zarejestrowanych" },
    { title: "Ankiety", value: surveyCount, icon: ClipboardList, desc: `${completedCount} ukończonych` },
    { title: "Realizacja", value: `${completionRate}%`, icon: TrendingUp, desc: "Wskaźnik ukończeń" },
    { title: "Alerty", value: openAlertCount, icon: AlertTriangle, desc: openAlertCount > 0 ? "Wymagają uwagi" : "Brak otwartych", accent: openAlertCount > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Panel JST</h1>
          <p className="text-sm text-muted-foreground mt-1">Analizy i raporty dla Gminy Solaris</p>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Link href="/panel/alerty" className="px-3 py-1.5 rounded-md border border-border text-[#1e3a5f] hover:bg-[#F8FAFC]">Alerty</Link>
          <Link href="/panel/zgloszenia" className="px-3 py-1.5 rounded-md border border-border text-[#1e3a5f] hover:bg-[#F8FAFC]">Zgłoszenia</Link>
          <Link href="/panel/heatmapa" className="px-3 py-1.5 rounded-md border border-border text-[#1e3a5f] hover:bg-[#F8FAFC]">Heatmapa</Link>
          <Link href="/panel/raport" className="px-3 py-1.5 rounded-md border border-border text-[#1e3a5f] hover:bg-[#F8FAFC]">Raport</Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.accent ? "bg-[#C9A84C]/10" : "bg-[#1e3a5f]/10"}`}>
                    <Icon size={18} className={kpi.accent ? "text-[#C9A84C]" : "text-[#1e3a5f]"} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-[#1e3a5f]">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#1e3a5f]">
              Rozkład poziomów opieki
            </CardTitle>
            <p className="text-xs text-muted-foreground">Na podstawie ukończonych ankiet</p>
          </CardHeader>
          <CardContent>
            {completedCount === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Brak ukończonych ankiet
              </div>
            ) : (
              <CareLevelChart data={careLevelDist} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#1e3a5f]">
              Ankiety — ostatnie 6 miesięcy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={monthlyData} />
          </CardContent>
        </Card>
      </div>

      {/* Care level legend */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-[#1e3a5f]">Legenda poziomów opieki</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {([1, 2, 3, 4, 5, 6, 7] as const).map((level) => {
              const cfg = CARE_LEVELS[level];
              const count = careLevelDist.find((d) => d.level === level)?.count ?? 0;
              return (
                <div
                  key={level}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100"
                  style={{ backgroundColor: cfg.bg }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  >
                    {level}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: cfg.color }}>{cfg.label}</p>
                    <p className="text-xs text-gray-500">{count} osób</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Map size={16} className="text-[#1e3a5f]" />
            <CardTitle className="text-base font-semibold text-[#1e3a5f]">Mapa seniorów i podmiotów opiekuńczych</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Seniorzy według poziomu opieki · Podmioty opiekuńcze z zasięgiem terytorialnym</p>
        </CardHeader>
        <CardContent>
          <MapPanelClient />
        </CardContent>
      </Card>

      {/* Alerts + Recent surveys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold text-[#1e3a5f]">Alerty</CardTitle>
            <span className="text-xs text-muted-foreground">{openAlertCount} otwartych</span>
          </CardHeader>
          <CardContent className="p-0">
            <AlertPanel
              alerts={alerts.map((a) => ({ ...a, senior: seniorBySurvey[a.surveyId] ?? null }))}
              openCount={openAlertCount}
            />
          </CardContent>
        </Card>

        {/* Recent surveys */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold text-[#1e3a5f]">Ostatnie ankiety</CardTitle>
            <Link href="/ankieta" className="text-xs text-[#1e3a5f] hover:underline flex items-center gap-1">
              Wszystkie <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentSurveys.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-6">
                <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Brak ankiet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSurveys.map((survey) => {
                  const senior = recentSeniorById[survey.seniorId];
                  const levelCfg = survey.careLevel ? CARE_LEVELS[survey.careLevel as keyof typeof CARE_LEVELS] : null;
                  return (
                    <Link
                      key={survey.id}
                      href={`/ankieta/${survey.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#1e3a5f]">
                            {senior?.firstName?.[0]}{senior?.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {senior ? `${senior.firstName} ${senior.lastName}` : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(survey.createdAt)}</p>
                        </div>
                      </div>
                      {levelCfg && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: levelCfg.color, backgroundColor: levelCfg.bg }}
                        >
                          Poz. {survey.careLevel}
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
    </div>
  );
}
