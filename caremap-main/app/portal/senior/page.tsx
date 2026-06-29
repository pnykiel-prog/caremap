import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, History, FileText, Sparkles } from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function SeniorHome() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  // Senior może być przypisany jako "owner" do swojego rekordu, albo email = email seniora.
  // Najpierw szukamy po ownerUserId, potem fallback po email.
  let mySenior = await prisma.senior.findFirst({
    where: { ownerUserId: userId },
    include: { surveys: { orderBy: { createdAt: "desc" }, include: { surveyorEntity: { select: { type: true } } } } },
  });
  if (!mySenior && session!.user?.email) {
    mySenior = await prisma.senior.findFirst({
      where: { email: session!.user.email },
      include: { surveys: { orderBy: { createdAt: "desc" }, include: { surveyorEntity: { select: { type: true } } } } },
    });
  }

  const lastSurvey = mySenior?.surveys[0];
  const cfg = lastSurvey?.careLevel
    ? CARE_LEVELS[lastSurvey.careLevel as keyof typeof CARE_LEVELS]
    : null;

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div>
        <h1 className="text-3xl font-bold text-[#1e3a5f]">
          Witaj, {session?.user?.name?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          To Twój prywatny portal opieki. Tutaj zobaczysz wyniki ankiet i historię badań.
        </p>
      </div>

      {/* Aktualny poziom opieki — duży, czytelny */}
      {lastSurvey?.careLevel && cfg ? (
        <Card
          className="border-2 shadow-md"
          style={{ borderColor: cfg.color + "60", background: cfg.bg }}
        >
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Sparkles size={32} style={{ color: cfg.color }} />
              <div className="flex-1">
                <p className="text-sm uppercase tracking-wider opacity-70" style={{ color: cfg.color }}>
                  Aktualny poziom opieki
                </p>
                <p className="text-4xl font-bold mt-1" style={{ color: cfg.color }}>
                  Poziom {lastSurvey.careLevel}
                </p>
                <p className="text-lg font-medium mt-1" style={{ color: cfg.color }}>
                  {cfg.label}
                </p>
                <p className="text-sm mt-3" style={{ color: cfg.color }}>
                  Ostatnie badanie: <span className="font-semibold">{fmt(lastSurvey.createdAt)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardContent className="p-8 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-base text-muted-foreground mb-4">
              Nie znaleziono jeszcze żadnej ankiety na Twoje konto.
            </p>
            <p className="text-sm text-muted-foreground">
              Skontaktuj się z gminą lub swoim opiekunem, aby umówić pierwsze badanie.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Szybkie akcje */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/portal/senior/historia">
          <Card className="bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                <History size={20} className="text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#1e3a5f]">Historia badań</p>
                <p className="text-sm text-muted-foreground">
                  {mySenior?.surveys.length ?? 0} ankiet w historii
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/senior/mapa-opieki">
          <Card className="bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
                <FileText size={20} className="text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#1e3a5f]">Mapa opieki</p>
                <p className="text-sm text-muted-foreground">Trend zmian w czasie</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {lastSurvey && (
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Ostatni raport</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Badanie z dnia {fmt(lastSurvey.createdAt)}</p>
                {lastSurvey.surveyorEntity?.type && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wypełnione przez podmiot typu {lastSurvey.surveyorEntity.type}
                  </p>
                )}
              </div>
              <Link href={`/ankieta/${lastSurvey.id}/wyniki`}>
                <Button variant="outline">Otwórz raport</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
