import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, ClipboardPlus, ChevronRight, CalendarDays } from "lucide-react";

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function AnkieterDashboard() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { entityId: true },
  });

  const assignments = membership
    ? await prisma.patientAssignment.findMany({
        where: { surveyorUserId: userId, entityId: membership.entityId, isActive: true },
        include: {
          senior: {
            include: {
              surveys: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Moi pacjenci</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {assignments.length} przypisanych pacjentów
          </p>
        </div>
        <Link href="/portal/ankieter/nowy-pacjent">
          <Button className="bg-[#1e3a5f] hover:bg-[#152b47] text-white w-full sm:w-auto">
            <UserPlus size={16} className="mr-2" />
            Nowy pacjent
          </Button>
        </Link>
      </div>

      {assignments.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-10 text-center">
            <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <h2 className="text-base font-semibold text-[#1e3a5f]">Brak przypisanych pacjentów</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              Dodaj swojego pierwszego pacjenta — system pomoże znaleźć osobę, jeśli już jest w bazie.
            </p>
            <Link href="/portal/ankieter/nowy-pacjent">
              <Button className="bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                Dodaj pierwszego pacjenta
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assignments.map((a) => {
            const last = a.senior.surveys[0];
            const level = last?.careLevel;
            const levelCfg = level ? CARE_LEVELS[level as keyof typeof CARE_LEVELS] : null;
            return (
              <Card key={a.id} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-[#1e3a5f]">
                          {a.senior.firstName[0]}
                          {a.senior.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1e3a5f] truncate">
                          {a.senior.firstName} {a.senior.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ur. {formatDate(a.senior.dateOfBirth)}
                        </p>
                      </div>
                    </div>
                    {levelCfg && (
                      <span
                        className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                        style={{ background: levelCfg.bg, color: levelCfg.color }}
                      >
                        P. {level}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays size={12} />
                      <span>
                        {last
                          ? `Ostatnie: ${formatDate(last.createdAt)}`
                          : "Brak badań"}
                      </span>
                    </div>
                    <Link
                      href={`/portal/ankieter/pacjent/${a.senior.id}`}
                      className="flex items-center gap-1 text-[#1e3a5f] font-medium hover:underline"
                    >
                      Karta pacjenta <ChevronRight size={12} />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Link
                      href={`/portal/ankieter/pacjent/${a.senior.id}`}
                      className="text-xs text-center border border-border rounded-md py-2 hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
                    >
                      Historia
                    </Link>
                    <Link
                      href={`/ankieta/nowa?seniorId=${a.senior.id}${last ? `&previousSurveyId=${last.id}` : ""}`}
                      className="text-xs text-center bg-[#1e3a5f] text-white rounded-md py-2 hover:bg-[#152b47] transition-colors inline-flex items-center justify-center gap-1"
                    >
                      <ClipboardPlus size={12} />
                      {last ? "Zbadaj ponownie" : "Wypełnij ankietę"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
