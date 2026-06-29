import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ReFillForm from "./ReFillForm";

export default async function PonowAnkietaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/logowanie");
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  // Load the survey being re-filled
  const survey = await prisma.survey.findFirst({
    where: { id, organizationId: orgId, status: "COMPLETED" },
  });
  if (!survey) notFound();

  const senior = await prisma.senior.findUnique({
    where: { id: survey.seniorId },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
  });
  if (!senior) notFound();

  // Load template
  let template = await prisma.surveyTemplate.findFirst({
    where: { organizationId: orgId, isDefault: true },
  });
  if (!template) {
    template = await prisma.surveyTemplate.findFirst({
      where: { organizationId: orgId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
  }
  if (!template) {
    template = await prisma.surveyTemplate.findFirst({
      where: { isDefault: true, status: "PUBLISHED" },
    });
  }
  if (!template) notFound();

  const sections = await prisma.templateSection.findMany({
    where: { templateId: template.id },
    orderBy: { order: "asc" },
  });

  const sectionsWithQuestions = await Promise.all(
    sections.map(async (s) => {
      const questions = await prisma.templateQuestion.findMany({
        where: { sectionId: s.id },
        orderBy: { order: "asc" },
      });
      return {
        id: s.id,
        code: s.code,
        title: s.title,
        order: s.order,
        maxScore: s.maxScore,
        questions: questions.map((q) => ({
          id: q.id,
          code: q.code,
          text: q.text,
          order: q.order,
          options: q.options as { value: number; label: string }[],
        })),
      };
    })
  );

  // Load previous answers: map questionId → value
  const prevAnswers = await prisma.surveyAnswer.findMany({
    where: { surveyId: id },
  });
  const prevByQuestionId: Record<string, number> = {};
  for (const a of prevAnswers) {
    prevByQuestionId[a.questionId] = a.value;
  }

  // Build previousAnswers as code → value
  const previousAnswers: Record<string, number> = {};
  for (const s of sectionsWithQuestions) {
    for (const q of s.questions) {
      if (prevByQuestionId[q.id] !== undefined) {
        previousAnswers[q.code] = prevByQuestionId[q.id];
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/ankieta/${id}/wyniki`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f] transition-colors"
        >
          <ChevronLeft size={16} />
          Wyniki
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-[#1e3a5f]">Wypełnij ponownie</span>
      </div>

      <ReFillForm
        previousSurveyId={id}
        templateId={template.id}
        senior={{
          id: senior.id,
          firstName: senior.firstName,
          lastName: senior.lastName,
          dateOfBirth: senior.dateOfBirth?.toISOString() ?? null,
        }}
        sections={sectionsWithQuestions}
        previousAnswers={previousAnswers}
      />
    </div>
  );
}
