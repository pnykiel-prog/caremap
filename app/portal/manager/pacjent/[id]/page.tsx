import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { logAccess } from "@/lib/audit";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function ManagerPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/logowanie");
  const userId = (session.user as { id?: string }).id!;
  const { id: seniorId } = await params;

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE", role: "ENTITY_MANAGER" },
    select: { entityId: true },
  });
  if (!membership) redirect("/auth/redirect");

  const senior = await prisma.senior.findUnique({
    where: { id: seniorId },
    include: {
      surveys: {
        orderBy: { createdAt: "desc" },
        include: { surveyorEntity: { select: { type: true, name: true } } },
      },
      assignments: {
        where: { entityId: membership.entityId },
        include: { surveyorUser: { select: { name: true } } },
      },
    },
  });
  if (!senior || senior.assignments.length === 0) notFound();

  await logAccess({
    userId,
    action: "VIEW",
    resource: "senior",
    resourceId: senior.id,
    metadata: { context: "manager_card" },
  });

  const lastSurvey = senior.surveys[0];
  const lastCfg = lastSurvey?.careLevel
    ? CARE_LEVELS[lastSurvey.careLevel as keyof typeof CARE_LEVELS]
    : null;

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <Link
        href="/portal/manager/pacjenci"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Pacjenci
      </Link>

      <Card className="bg-white">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
              <span className="text-lg font-bold text-[#1e3a5f]">
                {senior.firstName[0]}
                {senior.lastName[0]}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[#1e3a5f]">
                {senior.firstName} {senior.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">ur. {fmt(senior.dateOfBirth)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Przypisany ankieter:{" "}
                <span className="font-medium text-[#1e3a5f]">
                  {senior.assignments[0]?.surveyorUser.name}
                </span>
              </p>
            </div>
            {lastCfg && lastSurvey?.careLevel && (
              <div
                className="text-right p-3 rounded-lg"
                style={{ background: lastCfg.bg, color: lastCfg.color }}
              >
                <p className="text-xs opacity-70">Aktualny poziom</p>
                <p className="text-2xl font-bold">{lastSurvey.careLevel}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold text-[#1e3a5f]">Dane kontaktowe (krąg 3)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone size={14} />
              <span>{senior.phone ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail size={14} />
              <span>{senior.email ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-full">
              <MapPin size={14} />
              <span>
                {[senior.address, senior.postalCode, senior.city].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Pełna historia badań</p>
          {senior.surveys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak ankiet.</p>
          ) : (
            <div className="divide-y divide-border">
              {senior.surveys.map((s) => {
                const cfg = s.careLevel
                  ? CARE_LEVELS[s.careLevel as keyof typeof CARE_LEVELS]
                  : null;
                return (
                  <Link
                    key={s.id}
                    href={`/ankieta/${s.id}/wyniki`}
                    className="flex items-center justify-between py-3 hover:bg-[#F8FAFC] -mx-2 px-2 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-[#1e3a5f]">{fmt(s.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.surveyorEntity
                            ? `${s.surveyorEntity.name} (${s.surveyorEntity.type})`
                            : "Gmina / pracownik JST"}
                        </p>
                      </div>
                    </div>
                    {cfg && (
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        P. {s.careLevel}
                      </span>
                    )}
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
