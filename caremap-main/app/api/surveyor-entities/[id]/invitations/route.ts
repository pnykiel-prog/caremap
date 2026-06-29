import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ENTITY_SURVEYOR", "ENTITY_MANAGER"]).default("ENTITY_SURVEYOR"),
});

/**
 * Manager zaprasza pracownika do podmiotu — token jednorazowy ważny 48h (ANK-06 etap 3).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { id: entityId } = await params;

  // Tylko manager podmiotu może zapraszać
  const me = await prisma.surveyorMembership.findUnique({
    where: { userId_entityId: { userId, entityId } },
  });
  if (!me || me.status !== "ACTIVE" || me.role !== "ENTITY_MANAGER") {
    return NextResponse.json(
      { success: false, error: "Tylko manager podmiotu może zapraszać pracowników" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const invitation = await prisma.entityInvitation.create({
    data: {
      entityId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt,
      createdById: userId,
    },
  });

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    action: "CREATE",
    resource: "entity_invitation",
    resourceId: invitation.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { entityId, email: parsed.data.email, role: parsed.data.role },
  });

  // URL zaproszenia — w produkcji wysyłany przez Resend
  const inviteUrl = `/zaproszenie/${token}`;
  return NextResponse.json({ success: true, data: { token, inviteUrl, expiresAt } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { id: entityId } = await params;

  const me = await prisma.surveyorMembership.findUnique({
    where: { userId_entityId: { userId, entityId } },
  });
  if (!me || me.role !== "ENTITY_MANAGER")
    return NextResponse.json({ success: false, error: "Brak uprawnień" }, { status: 403 });

  const list = await prisma.entityInvitation.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: list });
}
