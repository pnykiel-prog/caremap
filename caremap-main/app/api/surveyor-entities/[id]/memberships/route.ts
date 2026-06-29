import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const statusSchema = z.object({
  membershipId: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

const transferSchema = z.object({
  op: z.literal("transfer-patients"),
  fromUserId: z.string(),
  toUserId: z.string(),
});

async function assertManager(userId: string, entityId: string): Promise<boolean> {
  const m = await prisma.surveyorMembership.findUnique({
    where: { userId_entityId: { userId, entityId } },
  });
  return !!m && m.status === "ACTIVE" && m.role === "ENTITY_MANAGER";
}

// PATCH — zmiana statusu membership
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { id: entityId } = await params;
  if (!(await assertManager(userId, entityId)))
    return NextResponse.json({ success: false, error: "Brak uprawnień" }, { status: 403 });

  const parsed = statusSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  await prisma.surveyorMembership.update({
    where: { id: parsed.data.membershipId },
    data: {
      status: parsed.data.status,
      suspendedAt: parsed.data.status === "SUSPENDED" ? new Date() : null,
    },
  });

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    action: parsed.data.status === "SUSPENDED" ? "SUSPEND" : "UPDATE",
    resource: "surveyor_membership",
    resourceId: parsed.data.membershipId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { entityId },
  });

  return NextResponse.json({ success: true });
}

// POST — transfer pacjentów
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { id: entityId } = await params;
  if (!(await assertManager(userId, entityId)))
    return NextResponse.json({ success: false, error: "Brak uprawnień" }, { status: 403 });

  const parsed = transferSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  // Sprawdź czy oba memberships są w tym podmiocie
  const [from, to] = await Promise.all([
    prisma.surveyorMembership.findUnique({
      where: { userId_entityId: { userId: parsed.data.fromUserId, entityId } },
    }),
    prisma.surveyorMembership.findUnique({
      where: { userId_entityId: { userId: parsed.data.toUserId, entityId } },
    }),
  ]);
  if (!from || !to || to.status !== "ACTIVE") {
    return NextResponse.json({ success: false, error: "Nieprawidłowi ankieterzy" }, { status: 400 });
  }

  const updated = await prisma.patientAssignment.updateMany({
    where: { entityId, surveyorUserId: parsed.data.fromUserId, isActive: true },
    data: { surveyorUserId: parsed.data.toUserId, assignedById: userId, transferredFromId: parsed.data.fromUserId },
  });

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    action: "UPDATE",
    resource: "patient_transfer",
    resourceId: entityId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { fromUserId: parsed.data.fromUserId, toUserId: parsed.data.toUserId, count: updated.count },
  });

  return NextResponse.json({ success: true, data: { transferred: updated.count } });
}
