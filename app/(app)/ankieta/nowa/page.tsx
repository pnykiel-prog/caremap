import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SurveyWizard } from "@/components/survey/SurveyWizard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NowaAnkietaPage() {
  const session = await auth();
  if (!session) redirect("/logowanie");
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  // Prefer default template; fall back to any PUBLISHED template for the org
  let template = await prisma.surveyTemplate.findFirst({
    where: { organizationId: orgId, isDefault: true },
  });

  if (!template) {
    template = await prisma.surveyTemplate.findFirst({
      where: { organizationId: orgId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
  }

  // Last resort: any template regardless of org (handles stale JWT orgId)
  if (!template) {
    template = await prisma.surveyTemplate.findFirst({
      where: { isDefault: true, status: "PUBLISHED" },
    });
  }

  if (!template) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-muted-foreground font-medium">Brak dostępnego szablonu ankiety.</p>
        <p className="text-sm text-muted-foreground">
          Spróbuj się wylogować i zalogować ponownie, a następnie odśwież stronę.
        </p>
      </div>
    );
  }

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
        ...s,
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

  const templateData = {
    id: template.id,
    name: template.name,
    sections: sectionsWithQuestions,
  };

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
        <span className="text-sm font-medium text-[#1e3a5f]">Nowa ankieta</span>
      </div>

      <SurveyWizard template={templateData} />
    </div>
  );
}
