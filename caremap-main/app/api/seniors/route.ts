import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId;
  const seniors = await prisma.senior.findMany({
    where: { organizationId: orgId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json({ success: true, data: seniors });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });
  const senior = await prisma.senior.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || undefined,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      organizationId: orgId,
      identificationConfidence: "NEW_RECORD",
    },
  });
  return NextResponse.json({ success: true, data: senior }, { status: 201 });
}
