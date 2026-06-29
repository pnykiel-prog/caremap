import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, AlertTriangle } from "lucide-react";

function diffMonths(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

export default async function ZaplanowanePage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId },
  });
  const high = settings?.reSurveyMonthsHigh ?? 3;
  const mid = settings?.reSurveyMonthsMid ?? 6;
  const low = settings?.reSurveyMonthsLow ?? 12;

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
              surveys: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
      })
    : [];

  const now = new Date();
  const items = assignments
    .map((a) => {
      const last = a.senior.surveys[0];
      if (!last) return null;
      const months = diffMonths(last.createdAt, now);
      const level = last.careLevel ?? 3;
      const expectedInterval = level >= 6 ? high : level >= 4 ? mid : low;
      const overdueMonths = months - expectedInterval;
      if (overdueMonths < -1) return null; // nie pokazujemy jeszcze
      return {
        senior: a.senior,
        last,
        months,
        expectedInterval,
        overdueMonths,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.overdueMonths - a.overdueMonths);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Do zrobienia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pacjenci, których termin ponownego badania zbliża się lub minął.
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-10 text-center">
            <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Wszyscy Twoi pacjenci są na bieżąco z badaniami.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((i) => {
            const overdue = i.overdueMonths >= 0;
            return (
              <Card
                key={i.senior.id}
                className={`bg-white ${overdue ? "border-2 border-red-200" : ""}`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        overdue ? "bg-red-100" : "bg-[#1e3a5f]/10"
                      }`}
                    >
                      {overdue ? (
                        <AlertTriangle size={18} className="text-red-600" />
                      ) : (
                        <CalendarClock size={18} className="text-[#1e3a5f]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1e3a5f] truncate">
                        {i.senior.firstName} {i.senior.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ostatnie {i.months} mies. temu · oczekiwany interwał {i.expectedInterval} mies.
                        {overdue
                          ? ` · termin przekroczony o ${i.overdueMonths} mies.`
                          : ` · za ${-i.overdueMonths} mies.`}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/ankieta/nowa?seniorId=${i.senior.id}&previousSurveyId=${i.last.id}`}
                    className="text-sm text-[#1e3a5f] font-medium hover:underline whitespace-nowrap"
                  >
                    Zbadaj
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
