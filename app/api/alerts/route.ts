import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const alerts = await prisma.alert.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const surveyIds = [...new Set(alerts.map((a) => a.surveyId))];
  const surveys = await prisma.survey.findMany({
    where: { id: { in: surveyIds } },
    select: { id: true, seniorId: true },
  });
  const seniorIds = [...new Set(surveys.map((s) => s.seniorId))];
  const seniors = await prisma.senior.findMany({
    where: { id: { in: seniorIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  const seniorById = Object.fromEntries(seniors.map((s) => [s.id, s]));
  const seniorBySurvey = Object.fromEntries(surveys.map((s) => [s.id, seniorById[s.seniorId]]));

  return NextResponse.json({
    success: true,
    data: alerts.map((a) => ({ ...a, senior: seniorBySurvey[a.surveyId] ?? null })),
  });
}

const updateSchema = z.object({
  alertId: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
  handledNote: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  const { alertId, status, handledNote } = parsed.data;
  const alert = await prisma.alert.findFirst({ where: { id: alertId, organizationId: orgId } });
  if (!alert) return NextResponse.json({ success: false, error: "Nie znaleziono" }, { status: 404 });

  const updated = await prisma.alert.update({
    where: { id: alertId },
    data: {
      status,
      handledNote,
      handledAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
