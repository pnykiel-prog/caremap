import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const ROLES_ALLOWED = [
  "SOCIAL_WORKER",
  "NURSE",
  "GP_DOCTOR",
  "MUNICIPALITY_WORKER",
  "VOLUNTEER",
  "NGO_COORDINATOR",
  "PROVIDER_MANAGER",
  "FAMILY_CAREGIVER",
] as const;

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES_ALLOWED),
  organizationSlug: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const sessionUser = session.user as { organizationId?: string; role?: string };
  const orgId = sessionUser.organizationId!;

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: users });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, role, organizationSlug } = parsed.data;

  const org = await prisma.organization.findUnique({ where: { slug: organizationSlug } });
  if (!org) {
    return NextResponse.json({ success: false, error: "Nie znaleziono organizacji" }, { status: 404 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ success: false, error: "Email jest już zajęty" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      status: "PENDING",
      organizationId: org.id,
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
