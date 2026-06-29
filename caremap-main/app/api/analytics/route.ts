import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const [
    seniorCount,
    surveyCount,
    completedSurveyCount,
    openAlertCount,
    allSurveys,
    allAlerts,
  ] = await Promise.all([
    prisma.senior.count({ where: { organizationId: orgId } }),
    prisma.survey.count({ where: { organizationId: orgId } }),
    prisma.survey.count({ where: { organizationId: orgId, status: "COMPLETED" } }),
    prisma.alert.count({ where: { organizationId: orgId, status: "OPEN" } }),
    prisma.survey.findMany({
      where: { organizationId: orgId, status: "COMPLETED", careLevel: { not: null } },
      select: { careLevel: true, createdAt: true },
    }),
    prisma.alert.findMany({
      where: { organizationId: orgId },
      select: { careLevel: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Care level distribution
  const careLevelDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const s of allSurveys) {
    if (s.careLevel) careLevelDist[s.careLevel] = (careLevelDist[s.careLevel] ?? 0) + 1;
  }

  // Surveys per month (last 6 months)
  const now = new Date();
  const monthlyData: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = d.toLocaleDateString("pl-PL", { month: "short", year: "2-digit" });
    const count = allSurveys.filter((s) => s.createdAt >= d && s.createdAt < next).length;
    monthlyData.push({ month: label, count });
  }

  return NextResponse.json({
    success: true,
    data: {
      kpi: {
        seniorCount,
        surveyCount,
        completedSurveyCount,
        openAlertCount,
        completionRate: surveyCount > 0 ? Math.round((completedSurveyCount / surveyCount) * 100) : 0,
      },
      careLevelDist: Object.entries(careLevelDist).map(([level, count]) => ({
        level: parseInt(level),
        count,
      })),
      monthlyData,
      recentAlerts: allAlerts,
    },
  });
}
