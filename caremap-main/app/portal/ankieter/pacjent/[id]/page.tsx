import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ClipboardPlus,
  Calendar,
  Phone,
  MapPin,
  Mail,
  Sparkles,
} from "lucide-react";
import { logAccess } from "@/lib/audit";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function PacjentKartaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/logowanie");
  const userId = (session.user as { id?: string }).id!;
  const { id: seniorId } = await params;

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { entityId: true, role: true },
  });
  if (!membership) redirect("/auth/redirect");

  const senior = await prisma.senior.findUnique({
    where: { id: seniorId },
    include: {
      surveys: {
        orderBy: { createdAt: "desc" },
        include: { surveyorEntity: { select: { type: true } } },
      },
      assignments: {
        where: { entityId: membership.entityId },
        select: { isActive: true, surveyorUserId: true },
      },
    },
  });
  if (!senior) notFound();

  // Krąg widoczności (ANK-12): krąg 3 (dane kontaktowe) — tylko jeśli podmiot ma assignment
  const inEntity = senior.assignments.length > 0;
  if (!inEntity && membership.role !== "ENTITY_MANAGER") {
    notFound();
  }

  await logAccess({
    userId,
    action: "VIEW",
    resource: "senior",
    resourceId: senior.id,
    metadata: { context: "ankieter_card" },
  });

  const lastSurvey = senior.surveys[0];
  const lastLevelCfg = lastSurvey?.careLevel
    ? CARE_LEVELS[lastSurvey.careLevel as keyof typeof CARE_LEVELS]
    : null;

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <Link
        href="/portal/ankieter"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Moi pacjenci
      </Link>

      <Card className="bg-white">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
                <span className="text-lg font-bold text-[#1e3a5f]">
                  {senior.firstName[0]}
                  {senior.lastName[0]}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1e3a5f]">
                  {senior.firstName} {senior.lastName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  ur. {fmt(senior.dateOfBirth)}
                  {senior.gender ? ` · ${senior.gender === "K" ? "kobieta" : "mężczyzna"}` : ""}
                </p>
              </div>
            </div>
            <Link
              href={`/ankieta/nowa?seniorId=${senior.id}${lastSurvey ? `&previousSurveyId=${lastSurvey.id}` : ""}`}
            >
              <Button className="bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                <ClipboardPlus size={14} className="mr-2" />
                {lastSurvey ? "Zbadaj ponownie" : "Wypełnij ankietę"}
              </Button>
            </Link>
          </div>

          {/* Aktualny poziom opieki */}
          {lastSurvey?.careLevel && lastLevelCfg && (
            <div
              className="mt-4 p-4 rounded-lg border-2"
              style={{ borderColor: lastLevelCfg.color + "40", background: lastLevelCfg.bg }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" style={{ color: lastLevelCfg.color }} />
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-70" style={{ color: lastLevelCfg.color }}>
                    Aktualny poziom opieki
                  </p>
                  <p className="text-base font-bold" style={{ color: lastLevelCfg.color }}>
                    Poziom {lastSurvey.careLevel}: {lastLevelCfg.label}
                  </p>
                  <p className="text-xs mt-1" style={{ color: lastLevelCfg.color }}>
                    Ostatnie badanie: {fmt(lastSurvey.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dane kontaktowe (krąg 3 — tylko własny podmiot) */}
      <Card className="bg-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Dane kontaktowe</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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

      {/* Historia ankiet (krąg 1 i 2 — wyniki i odpowiedzi widoczne ze wszystkich podmiotów) */}
      <Card className="bg-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Historia badań</p>
          {senior.surveys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak wypełnionych ankiet.</p>
          ) : (
            <div className="space-y-2">
              {senior.surveys.map((s) => {
                const cfg = s.careLevel
                  ? CARE_LEVELS[s.careLevel as keyof typeof CARE_LEVELS]
                  : null;
                return (
                  <Link
                    key={s.id}
                    href={`/ankieta/${s.id}/wyniki`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-[#1e3a5f] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-[#1e3a5f]">{fmt(s.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {/* P-02: pokazujemy TYP podmiotu, nie nazwisko ankietera */}
                          {s.surveyorEntity?.type
                            ? `Wypełnione przez podmiot typu ${s.surveyorEntity.type}`
                            : "Wypełnione przez pracownika gminy"}
                        </p>
                      </div>
                    </div>
                    {cfg && (
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        Poziom {s.careLevel}
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
