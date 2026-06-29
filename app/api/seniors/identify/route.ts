import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { scoreSeniorMatch } from "@/lib/senior-identify";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  const input = parsed.data;
  const allSeniors = await prisma.senior.findMany({ where: { organizationId: orgId } });

  const scored = allSeniors
    .map((s) => ({ senior: s, score: scoreSeniorMatch(s, input) }))
    .filter((x) => x.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const matches = scored.map(({ senior, score }) => ({
    id: senior.id,
    firstName: senior.firstName,
    lastName: senior.lastName,
    dateOfBirth: senior.dateOfBirth?.toISOString() ?? null,
    city: senior.city,
    phone: senior.phone,
    identificationConfidence: senior.identificationConfidence,
    similarity: Math.round(score * 100),
  }));

  return NextResponse.json({ success: true, data: { matches } });
}
