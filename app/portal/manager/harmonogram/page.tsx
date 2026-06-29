import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, AlertTriangle } from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
}
function diffMonths(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export default async function HarmonogramPage() {
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
    where: { userId, status: "ACTIVE", role: "ENTITY_MANAGER" },
    select: { entityId: true },
  });
  const entityId = membership!.entityId;

  const assignments = await prisma.patientAssignment.findMany({
    where: { entityId, isActive: true },
    include: {
      senior: {
        include: { surveys: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
      surveyorUser: { select: { name: true } },
    },
  });

  const now = new Date();
  const items = assignments
    .map((a) => {
      const last = a.senior.surveys[0];
      if (!last) return { a, last: null, months: Infinity, expected: low, overdue: Infinity };
      const months = diffMonths(last.createdAt, now);
      const level = last.careLevel ?? 3;
      const expected = level >= 6 ? high : level >= 4 ? mid : low;
      return { a, last, months, expected, overdue: months - expected };
    })
    .sort((x, y) => y.overdue - x.overdue);

  const overdueItems = items.filter((i) => i.overdue >= 0);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Harmonogram re-ankiet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Domyślne interwały (ustawiane przez gminę): poziom 6-7 → {high} mies., poziom 4-5 → {mid}{" "}
          mies., poziom 1-3 → {low} mies.
        </p>
      </div>

      <Card className="bg-white border-2 border-red-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-semibold text-[#1e3a5f]">
              Termin przekroczony ({overdueItems.length})
            </p>
          </div>
          {overdueItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Wszyscy pacjenci na bieżąco.</p>
          ) : (
            <div className="divide-y divide-border">
              {overdueItems.map((i) => (
                <div key={i.a.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1e3a5f] truncate">
                      {i.a.senior.firstName} {i.a.senior.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ankieter: {i.a.surveyorUser.name} · ostatnie:{" "}
                      {i.last ? fmt(i.last.createdAt) : "—"} · przekroczenie{" "}
                      <span className="text-red-600 font-semibold">{i.overdue} mies.</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-[#1e3a5f]" />
            <p className="text-sm font-semibold text-[#1e3a5f]">Wszystkie terminy</p>
          </div>
          <div className="divide-y divide-border">
            {items.slice(0, 50).map((i) => (
              <div key={i.a.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[#1e3a5f] truncate">
                    {i.a.senior.firstName} {i.a.senior.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {i.last ? `${i.months} mies. od ostatniego` : "brak badań"} ·{" "}
                    {i.a.surveyorUser.name}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                    i.overdue >= 0
                      ? "bg-red-100 text-red-700"
                      : i.overdue >= -1
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {i.last
                    ? i.overdue >= 0
                      ? `+${i.overdue} mies.`
                      : `za ${-i.overdue} mies.`
                    : "brak"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
