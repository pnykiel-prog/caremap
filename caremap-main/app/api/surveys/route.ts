import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calcScores, getCareLevel } from "@/lib/survey-algorithm";
import { notifyObserversOnNewSurvey, notifyUsers } from "@/lib/notifications";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const answerSchema = z.record(z.string(), z.number().int().min(0).max(3));

const createSchema = z.object({
  seniorId: z.string(),
  templateId: z.string(),
  answers: answerSchema,
  reporterName: z.string().optional(),
  reporterPhone: z.string().optional(),
  reporterEmail: z.string().optional(),
  reporterRole: z.string().optional(),
  previousSurveyId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const [surveys, total] = await Promise.all([
    prisma.survey.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.survey.count({ where: { organizationId: orgId } }),
  ]);

  const seniorIds = [...new Set(surveys.map((s) => s.seniorId))];
  const seniors = await prisma.senior.findMany({ where: { id: { in: seniorIds } } });
  const seniorsById = Object.fromEntries(seniors.map((s) => [s.id, s]));

  return NextResponse.json({ success: true, data: { surveys, seniors: seniorsById, total } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const userId = (session.user as { id?: string }).id!;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });

  const { seniorId, templateId, answers, reporterName, reporterPhone, reporterEmail, reporterRole, previousSurveyId } = parsed.data;

  // Load template sections for score calculation
  const sections = await prisma.templateSection.findMany({
    where: { templateId },
    include: { questions: { select: { id: true, code: true } } },
  });

  const scores = calcScores(answers, sections);
  const careLevel = getCareLevel(scores);

  // Build delta vs previous survey if provided
  let answerDelta: Record<string, { prev: number; curr: number }> | null = null;
  if (previousSurveyId) {
    const prevAnswers = await prisma.surveyAnswer.findMany({ where: { surveyId: previousSurveyId } });
    const prevMap: Record<string, number> = {};
    for (const a of prevAnswers) prevMap[a.questionId] = a.value;
    answerDelta = {};
    for (const [qCode, currVal] of Object.entries(answers)) {
      const q = sections.flatMap((s) => s.questions).find((q) => q.code === qCode);
      if (q && prevMap[q.id] !== undefined && prevMap[q.id] !== currVal) {
        answerDelta[qCode] = { prev: prevMap[q.id], curr: currVal };
      }
    }
  }

  // Load question ids for answer records
  const allQuestions = sections.flatMap((s) => s.questions);
  const questionByCode = Object.fromEntries(allQuestions.map((q) => [q.code, q]));

  // Jeśli zalogowany ma aktywne membership w podmiocie ankietującym — powiąż ankietę
  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { entityId: true },
  });

  const survey = await prisma.survey.create({
    data: {
      organizationId: orgId,
      templateId,
      seniorId,
      filledById: userId,
      reporterName,
      reporterPhone,
      reporterEmail,
      reporterRole,
      previousSurveyId,
      answerDelta: answerDelta ?? undefined,
      surveyorEntityId: membership?.entityId ?? null,
      surveyorUserId: membership ? userId : null,
      k1Score: scores.k1,
      k2Score: scores.k2,
      k3Score: scores.k3,
      k4Score: scores.k4,
      careLevel,
      status: "COMPLETED",
      completedAt: new Date(),
      answers: {
        create: Object.entries(answers)
          .filter(([code]) => questionByCode[code])
          .map(([code, value]) => ({
            questionId: questionByCode[code].id,
            value,
          })),
      },
    },
  });

  // ANK-14 — autor staje się obserwatorem seniora
  await prisma.surveyObserver.upsert({
    where: { seniorId_userId: { seniorId, userId } },
    create: { seniorId, userId, source: "FILLED_SURVEY" },
    update: {},
  });

  // Jeśli ankietę wypełnił pracownik podmiotu — manager też zostaje obserwatorem automatycznie
  if (membership?.entityId) {
    const managers = await prisma.surveyorMembership.findMany({
      where: { entityId: membership.entityId, role: "ENTITY_MANAGER", status: "ACTIVE" },
      select: { userId: true },
    });
    for (const m of managers) {
      await prisma.surveyObserver.upsert({
        where: { seniorId_userId: { seniorId, userId: m.userId } },
        create: { seniorId, userId: m.userId, source: "ENTITY_MANAGER" },
        update: {},
      });
    }
  }

  // Alert dla poziomu 6-7
  if (careLevel >= 6) {
    await prisma.alert.create({
      data: {
        organizationId: orgId,
        surveyId: survey.id,
        careLevel,
        status: "OPEN",
      },
    });
    // Powiadom pracowników JST gminy (ADMIN + MUNICIPALITY_WORKER) o nowym alercie
    const jstStaff = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        role: { in: ["ADMIN", "MUNICIPALITY_WORKER", "SOCIAL_WORKER"] },
      },
      select: { id: true },
    });
    await notifyUsers(
      jstStaff.map((u) => u.id),
      {
        kind: "CARE_LEVEL_ALERT",
        title: `Alert: poziom opieki ${careLevel}`,
        body: `Wypełniona ankieta wskazuje na poziom ${careLevel} — wymagana interwencja.`,
        url: `/panel/alerty`,
        payload: { surveyId: survey.id, seniorId, careLevel },
      },
    );
  }

  // ANK-14 — powiadom wszystkich obserwatorów (z wyłączeniem autora)
  await notifyObserversOnNewSurvey(seniorId, survey.id, userId);

  // Update senior identification confidence
  if (previousSurveyId) {
    await prisma.senior.update({
      where: { id: seniorId },
      data: { identificationConfidence: "NAME_DOB" },
    });
  }

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    organizationId: orgId,
    action: "CREATE",
    resource: "survey",
    resourceId: survey.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { seniorId, careLevel, surveyorEntityId: membership?.entityId ?? null },
  });

  return NextResponse.json({ success: true, data: survey }, { status: 201 });
}
