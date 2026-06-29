import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const schema = z.object({ note: z.string().min(2).max(500) });

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

  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const userId = (session.user as { id?: string }).id!;
  const { id: entityId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Wymagana adnotacja" }, { status: 400 });

  const link = await prisma.surveyorEntityGmina.findUnique({
    where: { entityId_organizationId: { entityId, organizationId: orgId } },
  });
  if (!link)
    return NextResponse.json({ success: false, error: "Brak wniosku" }, { status: 404 });

  await prisma.surveyorEntityGmina.update({
    where: { id: link.id },
    data: { status: "SUSPENDED", rejectionNote: parsed.data.note, approvedById: userId, approvedAt: new Date() },
  });

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    organizationId: orgId,
    action: "REJECT",
    resource: "surveyor_entity",
    resourceId: entityId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { note: parsed.data.note },
  });

  return NextResponse.json({ success: true });
}
