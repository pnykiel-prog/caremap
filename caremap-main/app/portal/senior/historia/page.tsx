import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ChevronRight } from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function SeniorHistoryPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const email = session!.user?.email ?? undefined;

  const mySenior =
    (await prisma.senior.findFirst({
      where: { ownerUserId: userId },
      include: {
        surveys: {
          orderBy: { createdAt: "desc" },
          include: { surveyorEntity: { select: { type: true, name: true } } },
        },
      },
    })) ??
    (email
      ? await prisma.senior.findFirst({
          where: { email },
          include: {
            surveys: {
              orderBy: { createdAt: "desc" },
              include: { surveyorEntity: { select: { type: true, name: true } } },
            },
          },
        })
      : null);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Historia badań</h1>
        <p className="text-base text-muted-foreground mt-1">
          Wszystkie ankiety wypełnione w systemie — niezależnie od podmiotu (zgodnie z art. 15 RODO).
        </p>
      </div>

      <Card className="bg-white">
        <CardContent className="p-0">
          {!mySenior || mySenior.surveys.length === 0 ? (
            <div className="p-10 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-base text-muted-foreground">Brak ankiet w historii.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {mySenior.surveys.map((s) => {
                const cfg = s.careLevel
                  ? CARE_LEVELS[s.careLevel as keyof typeof CARE_LEVELS]
                  : null;
                return (
                  <Link
                    key={s.id}
                    href={`/ankieta/${s.id}/wyniki`}
                    className="flex items-center justify-between p-5 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div>
                      <p className="text-base font-medium text-[#1e3a5f]">{fmt(s.createdAt)}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {s.surveyorEntity
                          ? `${s.surveyorEntity.name} (${s.surveyorEntity.type})`
                          : "Pracownik gminy"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {cfg && s.careLevel && (
                        <span
                          className="text-sm font-semibold px-3 py-1 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          Poziom {s.careLevel}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
