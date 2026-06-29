import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPesel, isValidPesel } from "@/lib/senior-identify";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const schema = z.object({
  // Albo powiązanie z istniejącym seniorem
  seniorId: z.string().optional(),
  // Albo dane nowego pacjenta
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["K", "M"]).optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().nullable(),
  pesel: z.string().optional(),

  // Zgoda RODO (ANK-08) — wymagana przy nowym przypisaniu
  consentGiven: z.boolean(),
  consentScope: z.string().optional(),
});

/**
 * Lista pacjentów przypisanych do zalogowanego ankietera (Portal Ankietera — ANK-03).
 * Manager pobiera tę listę z `/api/patients?scope=entity`.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "mine"; // mine | entity

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { entityId: true, role: true },
  });
  if (!membership)
    return NextResponse.json({ success: false, error: "Brak przynależności do podmiotu" }, { status: 403 });

  const where =
    scope === "entity" && membership.role === "ENTITY_MANAGER"
      ? { entityId: membership.entityId, isActive: true }
      : { surveyorUserId: userId, entityId: membership.entityId, isActive: true };

  const assignments = await prisma.patientAssignment.findMany({
    where,
    include: {
      senior: {
        include: {
          surveys: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, createdAt: true, careLevel: true, status: true },
          },
        },
      },
      surveyorUser: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  const data = assignments.map((a) => ({
    assignmentId: a.id,
    senior: {
      id: a.senior.id,
      pseudonimId: a.senior.pseudonimId,
      firstName: a.senior.firstName,
      lastName: a.senior.lastName,
      dateOfBirth: a.senior.dateOfBirth.toISOString().slice(0, 10),
      city: a.senior.city,
      phone: a.senior.phone,
    },
    surveyor: a.surveyorUser,
    lastSurvey: a.senior.surveys[0]
      ? {
          id: a.senior.surveys[0].id,
          date: a.senior.surveys[0].createdAt.toISOString().slice(0, 10),
          careLevel: a.senior.surveys[0].careLevel,
          status: a.senior.surveys[0].status,
        }
      : null,
    assignedAt: a.assignedAt,
  }));

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    action: "VIEW",
    resource: "patient_list",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { scope, count: data.length },
  });

  return NextResponse.json({ success: true, data });
}

/**
 * Tworzy lub powiązuje pacjenta z zalogowanym ankieterem.
 * - Jeśli `seniorId` podany: powiązuje istniejącego seniora z ankieterem (PatientAssignment).
 * - Jeśli brak: tworzy nowy rekord Senior + PatientAssignment + PatientConsent.
 * Dodaje też SurveyObserver dla ankietera (ANK-14).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });
  if (!parsed.data.consentGiven)
    return NextResponse.json({ success: false, error: "Wymagana zgoda RODO pacjenta" }, { status: 400 });

  const userId = (session.user as { id?: string }).id!;
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { entityId: true },
  });
  if (!membership)
    return NextResponse.json({ success: false, error: "Brak przynależności do podmiotu" }, { status: 403 });

  let seniorId = parsed.data.seniorId;

  if (!seniorId) {
    if (!parsed.data.firstName || !parsed.data.lastName || !parsed.data.dateOfBirth)
      return NextResponse.json(
        { success: false, error: "Brak danych nowego pacjenta" },
        { status: 400 },
      );

    let peselHash: string | null = null;
    if (parsed.data.pesel) {
      if (!isValidPesel(parsed.data.pesel))
        return NextResponse.json(
          { success: false, error: "Nieprawidłowy PESEL (suma kontrolna)" },
          { status: 400 },
        );
      peselHash = await hashPesel(parsed.data.pesel);
    }

    const newSenior = await prisma.senior.create({
      data: {
        organizationId: orgId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        dateOfBirth: new Date(parsed.data.dateOfBirth),
        gender: parsed.data.gender,
        address: parsed.data.address,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        peselHash,
        pseudonimId: `psd_${randomUUID().replace(/-/g, "")}`,
        identificationConfidence: peselHash ? "NAME_DOB_EXTRA" : "NAME_DOB",
      },
    });
    seniorId = newSenior.id;
  } else {
    // Powiązanie z istniejącym — jeśli PESEL podany i senior nie miał hash, zapisz
    if (parsed.data.pesel && isValidPesel(parsed.data.pesel)) {
      const existing = await prisma.senior.findUnique({ where: { id: seniorId } });
      if (existing && !existing.peselHash) {
        await prisma.senior.update({
          where: { id: seniorId },
          data: { peselHash: await hashPesel(parsed.data.pesel) },
        });
      }
    }
  }

  // PatientAssignment (upsert) — kasujemy stare przypisanie do tego podmiotu jeśli jest
  await prisma.patientAssignment.upsert({
    where: { seniorId_entityId: { seniorId, entityId: membership.entityId } },
    create: {
      seniorId,
      entityId: membership.entityId,
      surveyorUserId: userId,
      assignedById: userId,
      isActive: true,
    },
    update: { isActive: true, surveyorUserId: userId, assignedById: userId },
  });

  // PatientConsent (ANK-08)
  await prisma.patientConsent.upsert({
    where: { seniorId_entityId: { seniorId, entityId: membership.entityId } },
    create: {
      seniorId,
      entityId: membership.entityId,
      consentGiven: true,
      collectedById: userId,
      scope: parsed.data.consentScope ?? "DATA_PROCESSING",
    },
    update: { consentGiven: true, collectedById: userId, withdrawnAt: null },
  });

  // SurveyObserver — ankieter staje się obserwatorem (ANK-14)
  await prisma.surveyObserver.upsert({
    where: { seniorId_userId: { seniorId, userId } },
    create: { seniorId, userId, source: "FILLED_SURVEY" },
    update: {},
  });

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    organizationId: orgId,
    action: "CREATE",
    resource: "patient_assignment",
    resourceId: seniorId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      entityId: membership.entityId,
      isNewSenior: !parsed.data.seniorId,
      hasPesel: !!parsed.data.pesel,
    },
  });

  return NextResponse.json({ success: true, data: { seniorId } });
}
