import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, organizationId: orgId } });
  if (!survey) return NextResponse.json({ success: false, error: "Nie znaleziono" }, { status: 404 });

  const [senior, answers, sections] = await Promise.all([
    prisma.senior.findUnique({ where: { id: survey.seniorId } }),
    prisma.surveyAnswer.findMany({
      where: { surveyId: id },
      include: { question: { include: { section: true } } },
    }),
    prisma.templateSection.findMany({
      where: { templateId: survey.templateId },
      include: { questions: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return NextResponse.json({ success: true, data: { survey, senior, answers, sections } });
}
