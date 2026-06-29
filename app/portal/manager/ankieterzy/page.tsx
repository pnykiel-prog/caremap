import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SurveyorsClient } from "./SurveyorsClient";

export default async function AnkieterzyPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE", role: "ENTITY_MANAGER" },
    select: { entityId: true },
  });
  const entityId = membership!.entityId;

  const memberships = await prisma.surveyorMembership.findMany({
    where: { entityId, status: { in: ["ACTIVE", "SUSPENDED"] } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Statystyki per ankieter
  const stats = await Promise.all(
    memberships.map(async (m) => {
      const [patients, surveys] = await Promise.all([
        prisma.patientAssignment.count({
          where: { entityId, surveyorUserId: m.user.id, isActive: true },
        }),
        prisma.survey.count({
          where: { surveyorEntityId: entityId, surveyorUserId: m.user.id },
        }),
      ]);
      return {
        membershipId: m.id,
        user: m.user,
        role: m.role,
        status: m.status,
        patients,
        surveys,
      };
    }),
  );

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Ankieterzy w podmiocie</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzaj pracownikami, transferem pacjentów i statusem dostępu.
        </p>
      </div>

      <Card className="bg-white">
        <CardContent className="p-0">
          <SurveyorsClient entityId={entityId} surveyors={stats} />
        </CardContent>
      </Card>
    </div>
  );
}
