import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { SurveyResults } from "@/components/survey/SurveyResults";
import MatchingMapClient from "@/components/survey/MatchingMapClient";
import Link from "next/link";
import { ChevronLeft, Download, MapPin } from "lucide-react";
import type { TrendPoint } from "@/lib/survey-types";

export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/logowanie");
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, organizationId: orgId } });
  if (!survey) notFound();

  const senior = await prisma.senior.findUnique({
    where: { id: survey.seniorId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      city: true,
      geoLat: true,
      geoLon: true,
    },
  });
  if (!senior) notFound();

  // Fetch all active providers with geo coords + services
  const providers = await prisma.provider.findMany({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      geoLat: { not: null },
      geoLon: { not: null },
    },
    select: {
      id: true,
      name: true,
      type: true,
      city: true,
      geoLat: true,
      geoLon: true,
      coverageType: true,
      coverageRadius: true,
      status: true,
      capacity: true,
    },
  });

  // Fetch all completed surveys for this senior (for trend chart)
  const allSurveys = await prisma.survey.findMany({
    where: {
      seniorId: survey.seniorId,
      organizationId: orgId,
      status: "COMPLETED",
      completedAt: { not: null },
    },
    orderBy: { completedAt: "asc" },
    select: {
      id: true,
      k1Score: true,
      k2Score: true,
      k3Score: true,
      k4Score: true,
      careLevel: true,
      completedAt: true,
    },
  });

  const history: TrendPoint[] = allSurveys.map((s, i) => {
    const d = s.completedAt!;
    const dateLabel = d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
    const dateFull  = d.toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
    return {
      surveyId:  s.id,
      dateLabel: `${dateLabel} (#${i + 1})`,
      dateFull,
      k1: s.k1Score,
      k2: s.k2Score,
      k3: s.k3Score,
      k4: s.k4Score,
      level: s.careLevel,
    };
  });

  const providerIds = providers.map((p) => p.id);
  const services = await prisma.providerService.findMany({
    where: { providerId: { in: providerIds } },
    select: { providerId: true, serviceCode: true },
  });
  const servicesByProvider: Record<string, string[]> = {};
  for (const s of services) {
    if (!servicesByProvider[s.providerId]) servicesByProvider[s.providerId] = [];
    servicesByProvider[s.providerId].push(s.serviceCode);
  }

  const providerMarkers = providers.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    city: p.city,
    geoLat: p.geoLat as number,
    geoLon: p.geoLon as number,
    coverageType: p.coverageType,
    coverageRadius: p.coverageRadius,
    status: p.status,
    capacity: p.capacity,
    services: servicesByProvider[p.id] ?? [],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ankieta"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f] transition-colors"
          >
            <ChevronLeft size={16} />
            Ankiety
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-[#1e3a5f]">Wyniki</span>
        </div>
        <a
          href={`/api/surveys/${id}/report`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1e3a5f] border border-[#1e3a5f]/30 rounded-lg hover:bg-[#1e3a5f]/5 transition-colors"
        >
          <Download size={14} />
          Pobierz raport PDF
        </a>
      </div>

      {/* Survey results */}
      <SurveyResults
        survey={{
          id: survey.id,
          k1Score: survey.k1Score,
          k2Score: survey.k2Score,
          k3Score: survey.k3Score,
          k4Score: survey.k4Score,
          careLevel: survey.careLevel,
          completedAt: survey.completedAt?.toISOString() ?? null,
        }}
        senior={{
          firstName: senior.firstName,
          lastName: senior.lastName,
          dateOfBirth: senior.dateOfBirth?.toISOString() ?? null,
          city: senior.city,
        }}
        mapId="matching-map"
        surveyCount={allSurveys.length}
        surveyIndex={allSurveys.findIndex((s) => s.id === survey.id) + 1}
        history={history}
      />

      {/* Matching map */}
      <div id="matching-map" className="space-y-3 pt-2 scroll-mt-20">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <MapPin size={16} className="text-[#1e3a5f]" />
          <h2 className="text-base font-semibold text-[#1e3a5f]">Dopasowanie podmiotów — mapa</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Na mapie widoczne są aktywne podmioty opiekuńcze. Filtruj według rodzaju usługi, aby znaleźć
          najlepsze dopasowanie dla{" "}
          <strong>{senior.firstName} {senior.lastName}</strong>.
        </p>

        <MatchingMapClient
          senior={{
            firstName: senior.firstName,
            lastName: senior.lastName,
            city: senior.city,
            geoLat: senior.geoLat,
            geoLon: senior.geoLon,
            careLevel: survey.careLevel,
          }}
          providers={providerMarkers}
        />
      </div>
    </div>
  );
}
