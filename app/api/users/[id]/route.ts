import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "REJECTED", "SUSPENDED", "PENDING"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const sessionUser = session.user as { organizationId?: string; role?: string };
  const orgId = sessionUser.organizationId!;
  const isAdmin = sessionUser.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ success: false, error: "Brak uprawnień" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({ where: { id, organizationId: orgId } });
  if (!target) return NextResponse.json({ success: false, error: "Nie znaleziono użytkownika" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
