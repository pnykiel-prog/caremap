import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]),
  rejectionNote: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const sessionUser = session.user as { role?: string; organizationId?: string };
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Tylko administrator może zmieniać status podmiotu" }, { status: 403 });
  }

  const orgId = sessionUser.organizationId!;
  const { id } = await params;

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider || provider.organizationId !== orgId) {
    return NextResponse.json({ success: false, error: "Podmiot nie istnieje" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const updated = await prisma.provider.update({
    where: { id },
    data: {
      status: parsed.data.status,
      rejectionNote: parsed.data.rejectionNote ?? null,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
