import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const upsertSchema = z.object({
  status: z.enum(["AVAILABLE", "LIMITED", "FULL", "SUSPENDED"]),
  freePlaces: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const { id } = await params;

  // Verify provider belongs to org
  const provider = await prisma.provider.findFirst({ where: { id, organizationId: orgId } });
  if (!provider) return NextResponse.json({ success: false, error: "Nie znaleziono podmiotu" }, { status: 404 });

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const { status, freePlaces, notes } = parsed.data;

  const availability = await prisma.providerAvailability.upsert({
    where: { providerId_date: { providerId: id, date: today } },
    create: { providerId: id, date: today, status, freePlaces, notes },
    update: { status, freePlaces, notes },
  });

  return NextResponse.json({ success: true, data: availability });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const { id } = await params;

  const provider = await prisma.provider.findFirst({ where: { id, organizationId: orgId } });
  if (!provider) return NextResponse.json({ success: false, error: "Nie znaleziono podmiotu" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];
  const availability = await prisma.providerAvailability.findUnique({
    where: { providerId_date: { providerId: id, date: today } },
  });

  return NextResponse.json({ success: true, data: availability });
}
