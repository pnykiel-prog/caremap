import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(8),
  name: z.string().min(2),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  const inv = await prisma.entityInvitation.findUnique({
    where: { token: parsed.data.token },
    include: { entity: { include: { gminaLinks: true } } },
  });
  if (!inv)
    return NextResponse.json({ success: false, error: "Zaproszenie nieznane" }, { status: 404 });
  if (inv.acceptedAt)
    return NextResponse.json({ success: false, error: "Już wykorzystane" }, { status: 410 });
  if (inv.expiresAt < new Date())
    return NextResponse.json({ success: false, error: "Wygasło" }, { status: 410 });

  // Wybierz pierwszą aktywną gminę powiązaną z podmiotem jako organizationId nowego usera
  const activeLink =
    inv.entity.gminaLinks.find((l) => l.status === "ACTIVE") ??
    inv.entity.gminaLinks[0];
  if (!activeLink)
    return NextResponse.json(
      { success: false, error: "Podmiot nie jest powiązany z żadną gminą" },
      { status: 409 },
    );

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const existing = await prisma.user.findUnique({ where: { email: inv.email } });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name: parsed.data.name, password: passwordHash, status: "ACTIVE" },
      })
    : await prisma.user.create({
        data: {
          email: inv.email,
          name: parsed.data.name,
          password: passwordHash,
          organizationId: activeLink.organizationId,
          role: inv.role === "ENTITY_MANAGER" ? "PROVIDER_MANAGER" : "VOLUNTEER",
          status: "ACTIVE",
          activeContext: inv.role === "ENTITY_MANAGER" ? "manager" : "surveyor",
        },
      });

  await prisma.surveyorMembership.upsert({
    where: { userId_entityId: { userId: user.id, entityId: inv.entityId } },
    create: {
      userId: user.id,
      entityId: inv.entityId,
      role: inv.role,
      status: "ACTIVE",
      invitedById: inv.createdById,
    },
    update: { status: "ACTIVE", role: inv.role },
  });

  await prisma.entityInvitation.update({
    where: { id: inv.id },
    data: { acceptedAt: new Date() },
  });

  const meta = extractRequestMeta(req);
  await logAccess({
    userId: user.id,
    action: "CREATE",
    resource: "surveyor_membership",
    resourceId: inv.entityId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { viaInvitation: inv.id, role: inv.role },
  });

  return NextResponse.json({
    success: true,
    data: {
      userId: user.id,
      email: user.email,
      role: inv.role,
    },
  });
}
