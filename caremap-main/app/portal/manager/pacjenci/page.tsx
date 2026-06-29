import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { ChevronRight } from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ManagerPatientsPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
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
      surveyorUser: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Wszyscy pacjenci</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {assignments.length} aktywnych przypisań w Twoim podmiocie.
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Brak pacjentów w podmiocie.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white overflow-hidden">
          <div className="divide-y divide-border">
            {assignments.map((a) => {
              const last = a.senior.surveys[0];
              const cfg = last?.careLevel
                ? CARE_LEVELS[last.careLevel as keyof typeof CARE_LEVELS]
                : null;
              return (
                <Link
                  key={a.id}
                  href={`/portal/manager/pacjent/${a.senior.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#1e3a5f]">
                        {a.senior.firstName[0]}
                        {a.senior.lastName[0]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1e3a5f]">
                        {a.senior.firstName} {a.senior.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ankieter: {a.surveyorUser.name} ·{" "}
                        {last ? `ostatnie: ${fmt(last.createdAt)}` : "brak badań"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {cfg && (
                      <span
                        className="text-[10px] font-semibold px-2 py-1 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        Poziom {last?.careLevel}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
