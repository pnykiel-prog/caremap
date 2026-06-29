import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import { CARE_LEVELS } from "@/lib/survey-algorithm";

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/logowanie");
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, organizationId: orgId } });
  if (!survey) notFound();

  const senior = await prisma.senior.findUnique({ where: { id: survey.seniorId } });

  const statusMap: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Szkic", className: "bg-gray-100 text-gray-700" },
    COMPLETED: { label: "Ukończona", className: "bg-green-100 text-green-700" },
    REPORT_SENT: { label: "Raport wysłany", className: "bg-blue-100 text-blue-700" },
  };
  const statusCfg = statusMap[survey.status] ?? statusMap.DRAFT;
  const level = survey.careLevel;
  const levelCfg = level ? CARE_LEVELS[level as keyof typeof CARE_LEVELS] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/ankieta"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f] transition-colors"
        >
          <ChevronLeft size={16} />
          Ankiety
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-[#1e3a5f]">
          {senior ? `${senior.firstName} ${senior.lastName}` : "Szczegóły ankiety"}
        </span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            {senior ? `${senior.firstName} ${senior.lastName}` : "Ankieta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Wypełniona {formatDate(survey.createdAt)}</p>
        </div>
        {survey.status === "COMPLETED" && (
          <Link
            href={`/ankieta/${id}/wyniki`}
            className={cn(buttonVariants({ variant: "default" }), "bg-[#1e3a5f] hover:bg-[#152b47] text-white gap-2")}
          >
            <BarChart3 size={16} />
            Wyniki
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "K1 — Sytuacja życiowa", value: survey.k1Score },
          { label: "K2 — Samodzielność", value: survey.k2Score },
          { label: "K3 — Poza domem", value: survey.k3Score },
          { label: "K4 — Bezpieczeństwo", value: survey.k4Score },
        ].map((s) => (
          <Card key={s.label} className="bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-[#1e3a5f]">
                {s.value !== null && s.value !== undefined ? `${s.value}%` : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#1e3a5f]">Informacje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>
          {level && levelCfg && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Poziom opieki</span>
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ color: levelCfg.color, backgroundColor: levelCfg.bg }}
              >
                Poziom {level} — {levelCfg.label}
              </span>
            </div>
          )}
          {survey.reporterName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wypełnił/a</span>
              <span>{survey.reporterName}</span>
            </div>
          )}
          {survey.completedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ukończono</span>
              <span>{formatDate(survey.completedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
