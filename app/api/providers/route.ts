import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  city: z.string().min(1),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  capacity: z.number().int().min(0).default(0),
  coverageType: z.enum(["ADDRESS_ONLY", "RADIUS", "CITY_LIST"]),
  coverageRadius: z.number().int().min(0).optional(),
  coverageCities: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const providers = await prisma.provider.findMany({
    where: { organizationId: orgId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const today = new Date().toISOString().split("T")[0];
  const availabilities = await prisma.providerAvailability.findMany({
    where: { providerId: { in: providers.map((p) => p.id) }, date: today },
  });
  const availByProvider = Object.fromEntries(availabilities.map((a) => [a.providerId, a]));

  return NextResponse.json({
    success: true,
    data: providers.map((p) => ({ ...p, todayAvailability: availByProvider[p.id] ?? null })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });

  const { email, website, coverageCities, ...rest } = parsed.data;

  const provider = await prisma.provider.create({
    data: {
      ...rest,
      email: email || undefined,
      website: website || undefined,
      coverageCities: coverageCities ?? undefined,
      organizationId: orgId,
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, data: provider }, { status: 201 });
}
