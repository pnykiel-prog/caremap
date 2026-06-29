import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ChevronRight, CheckCircle2 } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Szkic", cls: "bg-gray-100 text-gray-700" },
  PUBLISHED: { label: "Opublikowany", cls: "bg-green-100 text-green-700" },
  ARCHIVED: { label: "Archiwalny", cls: "bg-orange-100 text-orange-700" },
};

const KIND_LABEL: Record<string, string> = {
  FULL: "Pełna (K1-K4)",
  SCREENING: "Przesiewowa",
  PROGRAM: "Pod program",
  SPECIALIZED: "Specjalistyczna",
};

export default async function AdminTemplatesPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/");
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const templates = await prisma.surveyTemplate.findMany({
    where: { organizationId: orgId },
    include: {
      sections: { select: { id: true, _count: { select: { questions: true } } } },
      _count: { select: { surveys: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Szablony ankiet (ARCH-01 / ARCH-02)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wiele równoległych ankiet w jednej gminie — pełne K1-K4, przesiewowe, programowe.
        </p>
      </div>

      <Card className="bg-white overflow-hidden">
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Brak szablonów. Uruchom seed.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {templates.map((t) => {
                const qCount = t.sections.reduce((a, s) => a + s._count.questions, 0);
                const cfg = STATUS_LABEL[t.status];
                return (
                  <Link
                    key={t.id}
                    href={`/admin/szablony/${t.id}`}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-[#1e3a5f]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1e3a5f] truncate">{t.name}</p>
                          {t.isDefault && <CheckCircle2 size={12} className="text-[#C9A84C]" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {KIND_LABEL[t.kind] ?? t.kind} · {t.sections.length} sekcji · {qCount}{" "}
                          pytań · v{t.version} · {t._count.surveys} wypełnień
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Pełny kreator szablonów (edycja pytań, logika warunkowa, publikacja nowej wersji) jest częścią
        backlogu ARCH-01 / ARCH-02 — w bieżącej wersji widoczna jest lista i metadane szablonów.
      </p>
    </div>
  );
}
