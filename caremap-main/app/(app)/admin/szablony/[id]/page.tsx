import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

interface Option {
  value: number;
  label: string;
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/");
  const orgId = (session!.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  const template = await prisma.surveyTemplate.findFirst({
    where: { id, organizationId: orgId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { questions: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!template) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/szablony"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Szablony ankiet
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{template.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {template.description ?? "Brak opisu"} · wersja {template.version} · {template.status}
        </p>
      </div>

      {template.sections.map((sec) => (
        <Card key={sec.id} className="bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-[#1e3a5f]">
              {sec.code} — {sec.title}
            </p>
            {sec.description && (
              <p className="text-xs text-muted-foreground mt-1 mb-3">{sec.description}</p>
            )}
            <div className="divide-y divide-border mt-3">
              {sec.questions.map((q) => {
                const opts = (q.options as unknown as Option[]) ?? [];
                return (
                  <div key={q.id} className="py-3">
                    <p className="text-sm font-medium text-[#1e3a5f]">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{q.code}</span>
                      {q.text}
                    </p>
                    {opts.length > 0 && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {opts.map((o) => (
                          <div
                            key={o.value}
                            className="text-xs text-muted-foreground bg-[#F8FAFC] rounded px-2 py-1"
                          >
                            <span className="font-mono text-[#1e3a5f] mr-2">{o.value}</span>
                            {o.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
