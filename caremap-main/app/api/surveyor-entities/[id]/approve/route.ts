import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

/**
 * Zatwierdzenie podmiotu w gminie zalogowanego admina (ANK-06 etap 2 + P-12).
 * - aktywuje link SurveyorEntityGmina (status ACTIVE)
 * - jeśli to pierwsze zatwierdzenie podmiotu globalnie: aktywuje też SurveyorEntity (ACTIVE)
 * - tworzy konto managera kontaktowego z hasłem inicjalnym (wysyłka emailem TODO)
 *   + SurveyorMembership ENTITY_MANAGER status ACTIVE
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MUNICIPALITY_WORKER")
    return NextResponse.json({ success: false, error: "Brak uprawnień" }, { status: 403 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId)
    return NextResponse.json({ success: false, error: "Brak gminy" }, { status: 400 });

  const { id: entityId } = await params;
  const userId = (session.user as { id?: string }).id!;

  // Sprawdź link gmina–podmiot
  const link = await prisma.surveyorEntityGmina.findUnique({
    where: { entityId_organizationId: { entityId, organizationId: orgId } },
    include: { entity: true },
  });
  if (!link) {
    return NextResponse.json(
      { success: false, error: "Podmiot nie aplikował do tej gminy" },
      { status: 404 },
    );
  }
  if (link.status === "ACTIVE") {
    return NextResponse.json({ success: true, data: { alreadyApproved: true } });
  }

  // Aktywuj link
  await prisma.surveyorEntityGmina.update({
    where: { id: link.id },
    data: { status: "ACTIVE", approvedById: userId, approvedAt: new Date(), rejectionNote: null },
  });

  // Jeśli podmiot jest jeszcze PENDING globalnie — aktywuj
  if (link.entity.status === "PENDING") {
    await prisma.surveyorEntity.update({
      where: { id: entityId },
      data: { status: "ACTIVE", approvedById: userId, approvedAt: new Date(), rejectionNote: null },
    });
  }

  // Zarejestruj konto managera kontaktowego (jeśli jeszcze nie ma)
  let managerUser = link.entity.contactManagerEmail
    ? await prisma.user.findUnique({ where: { email: link.entity.contactManagerEmail } })
    : null;

  let temporaryPassword: string | null = null;
  if (!managerUser && link.entity.contactManagerEmail && link.entity.contactManagerName) {
    temporaryPassword = Math.random().toString(36).slice(-10) + "Aa1!";
    const hash = await bcrypt.hash(temporaryPassword, 10);
    managerUser = await prisma.user.create({
      data: {
        email: link.entity.contactManagerEmail,
        name: link.entity.contactManagerName,
        password: hash,
        organizationId: orgId,
        role: "PROVIDER_MANAGER",
        status: "ACTIVE",
        activeContext: "manager",
      },
    });
  }

  if (managerUser) {
    await prisma.surveyorMembership.upsert({
      where: { userId_entityId: { userId: managerUser.id, entityId } },
      create: {
        userId: managerUser.id,
        entityId,
        role: "ENTITY_MANAGER",
        status: "ACTIVE",
      },
      update: { status: "ACTIVE", role: "ENTITY_MANAGER" },
    });
  }

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    organizationId: orgId,
    action: "APPROVE",
    resource: "surveyor_entity",
    resourceId: entityId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { managerCreated: !!temporaryPassword, managerEmail: link.entity.contactManagerEmail },
  });

  return NextResponse.json({
    success: true,
    data: {
      entityId,
      temporaryPassword, // FIXME: w produkcji wysyłać emailem przez Resend, nie zwracać w JSON
    },
  });
}
