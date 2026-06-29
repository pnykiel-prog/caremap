import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

/**
 * Lista podmiotów ankietujących widziana przez JST admina/pracownika.
 * Filtrowana po gminie z sesji + opcjonalnie status w query string.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ success: false, error: "Brak gminy" }, { status: 400 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // PENDING / ACTIVE / SUSPENDED / all

  const links = await prisma.surveyorEntityGmina.findMany({
    where: {
      organizationId: orgId,
      ...(status && status !== "all" ? { status: status as "PENDING" | "ACTIVE" | "SUSPENDED" } : {}),
    },
    include: { entity: { include: { memberships: { select: { id: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const data = links.map((l) => ({
    linkId: l.id,
    entity: l.entity,
    linkStatus: l.status,
    approvedAt: l.approvedAt,
    rejectionNote: l.rejectionNote,
    memberCount: l.entity.memberships.length,
  }));

  const meta = extractRequestMeta(req);
  await logAccess({
    userId: (session.user as { id?: string }).id,
    organizationId: orgId,
    action: "VIEW",
    resource: "surveyor_entity_list",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { status: status ?? "all", count: data.length },
  });

  return NextResponse.json({ success: true, data });
}
