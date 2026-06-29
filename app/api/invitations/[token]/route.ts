import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await prisma.entityInvitation.findUnique({
    where: { token },
    include: { entity: true },
  });
  if (!inv)
    return NextResponse.json({ success: false, error: "Nie znaleziono zaproszenia" }, { status: 404 });
  if (inv.acceptedAt)
    return NextResponse.json({ success: false, error: "Zaproszenie już wykorzystane" }, { status: 410 });
  if (inv.expiresAt < new Date())
    return NextResponse.json({ success: false, error: "Zaproszenie wygasło" }, { status: 410 });

  return NextResponse.json({
    success: true,
    data: {
      email: inv.email,
      role: inv.role,
      entity: { id: inv.entity.id, name: inv.entity.name, type: inv.entity.type },
      expiresAt: inv.expiresAt,
    },
  });
}
