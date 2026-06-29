import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Users,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string })?.organizationId;

  const [seniorCount, surveyCount, alertCount, recentSurveys] = await Promise.all([
    prisma.senior.count({ where: { organizationId: orgId } }),
    prisma.survey.count({ where: { organizationId: orgId } }),
    prisma.alert.count({ where: { organizationId: orgId, status: "OPEN" } }),
    prisma.survey.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const seniorIds = recentSurveys.map((s) => s.seniorId);
  const seniors = await prisma.senior.findMany({ where: { id: { in: seniorIds } } });
  const seniorsById = Object.fromEntries(seniors.map((s) => [s.id, s]));

  const completedSurveys = await prisma.survey.count({
    where: { organizationId: orgId, status: "COMPLETED" },
  });

  const surveyCompletionRate =
    surveyCount > 0 ? Math.round((completedSurveys / surveyCount) * 100) : 0;

  const stats = [
    {
      title: "Aktywni seniorzy",
      value: seniorCount,
      icon: Users,
      color: "text-[#1e3a5f]",
      bg: "bg-[#1e3a5f]/10",
      description: "Zarejestrowanych w systemie",
    },
    {
      title: "Wszystkie ankiety",
      value: surveyCount,
      icon: ClipboardList,
      color: "text-[#1e3a5f]",
      bg: "bg-[#1e3a5f]/10",
      description: `${completedSurveys} ukończonych (${surveyCompletionRate}%)`,
    },
    {
      title: "Otwarte alerty",
      value: alertCount,
      icon: AlertTriangle,
      color: alertCount > 0 ? "text-[#C9A84C]" : "text-green-600",
      bg: alertCount > 0 ? "bg-[#C9A84C]/10" : "bg-green-50",
      description: alertCount > 0 ? "Wymagają uwagi" : "Brak aktywnych alertów",
    },
    {
      title: "Wskaźnik realizacji",
      value: `${surveyCompletionRate}%`,
      icon: TrendingUp,
      color: "text-[#1e3a5f]",
      bg: "bg-[#1e3a5f]/10",
      description: "Ankiety ukończone",
    },
  ];

  const surveyStatusConfig: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Szkic", className: "bg-gray-100 text-gray-700" },
    COMPLETED: { label: "Ukończona", className: "bg-green-100 text-green-700" },
    REPORT_SENT: { label: "Raport wysłany", className: "bg-blue-100 text-blue-700" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Panel główny</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Witaj, {session?.user?.name?.split(" ")[0]}. Oto aktualny przegląd systemu.
          </p>
        </div>
        <Link
          href="/ankieta/nowa"
          className={cn(buttonVariants({ variant: "default" }), "bg-[#1e3a5f] hover:bg-[#152b47] text-white")}
        >
          <ClipboardList size={16} className="mr-2" />
          Nowa ankieta
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-white shadow-sm border-border hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${stat.color}`} size={18} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-[#1e3a5f]">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent surveys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold text-[#1e3a5f]">
              Ostatnie ankiety
            </CardTitle>
            <Link
              href="/ankieta"
              className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:text-[#152b47] font-medium"
            >
              Zobacz wszystkie <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentSurveys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Brak ankiet do wyświetlenia</p>
                <Link
                  href="/ankieta/nowa"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
                >
                  Utwórz pierwszą ankietę
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSurveys.map((survey) => {
                  const statusCfg = surveyStatusConfig[survey.status] ?? surveyStatusConfig.DRAFT;
                  return (
                    <Link
                      key={survey.id}
                      href={`/ankieta/${survey.id}`}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#1e3a5f]">
                            {seniorsById[survey.seniorId]?.firstName?.[0]}{seniorsById[survey.seniorId]?.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {seniorsById[survey.seniorId]?.firstName} {seniorsById[survey.seniorId]?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(survey.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1e3a5f]">
              Szybkie akcje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Nowa ankieta", href: "/ankieta/nowa", icon: ClipboardList, desc: "Wypełnij kwestionariusz K1-K4" },
              { label: "Dodaj seniora", href: "/seniorzy/nowy", icon: Users, desc: "Ręcznie lub import z pliku CSV" },
              { label: "Panel JST", href: "/panel", icon: TrendingUp, desc: "Analizy i raporty zbiorcze" },
              { label: "Podmioty", href: "/podmioty", icon: CheckCircle2, desc: "Zarządzaj podmiotami opieki" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-border transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1e3a5f] transition-colors">
                    <Icon size={16} className="text-[#1e3a5f] group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.desc}</p>
                  </div>
                  <Clock size={12} className="text-muted-foreground/40 flex-shrink-0" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
