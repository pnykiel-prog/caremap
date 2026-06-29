import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  // Seniors with their latest completed survey care level
  const seniors = await prisma.senior.findMany({
    where: { organizationId: orgId, geoLat: { not: null }, geoLon: { not: null } },
    select: { id: true, firstName: true, lastName: true, geoLat: true, geoLon: true, city: true },
  });

  const seniorIds = seniors.map((s) => s.id);
  const latestSurveys = await prisma.survey.findMany({
    where: {
      organizationId: orgId,
      seniorId: { in: seniorIds },
      status: "COMPLETED",
      careLevel: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { seniorId: true, careLevel: true, createdAt: true },
  });

  // Keep only the latest survey per senior
  const latestBySenior: Record<string, number> = {};
  for (const s of latestSurveys) {
    if (!(s.seniorId in latestBySenior)) {
      latestBySenior[s.seniorId] = s.careLevel as number;
    }
  }

  // Providers
  const providers = await prisma.provider.findMany({
    where: { organizationId: orgId, geoLat: { not: null }, geoLon: { not: null } },
    select: {
      id: true,
      name: true,
      type: true,
      city: true,
      geoLat: true,
      geoLon: true,
      coverageType: true,
      coverageRadius: true,
      coverageCities: true,
      status: true,
      capacity: true,
    },
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

  return NextResponse.json({
    success: true,
    data: {
      seniors: seniors.map((s) => ({
        ...s,
        careLevel: latestBySenior[s.id] ?? null,
      })),
      providers: providers.map((p) => ({
        ...p,
        services: servicesByProvider[p.id] ?? [],
      })),
    },
  });
}
