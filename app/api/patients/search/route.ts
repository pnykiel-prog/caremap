import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  scoreSeniorMatch,
  comparePesel,
  type PatientSearchHit,
  type SearchCircle,
} from "@/lib/senior-identify";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string().optional(),
  pesel: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

/**
 * ANK-07 — wyszukuje seniorów w trzech kręgach:
 *  - MINE: pacjenci aktywnie przypisani do zalogowanego ankietera
 *  - ENTITY: pacjenci całego podmiotu zalogowanego ankietera
 *  - SYSTEM: dowolny senior w bazie tej gminy (delikatna sugestia, bez szczegółów)
 *
 * Jeśli podano PESEL — uruchamia weryfikację bcrypt na kandydatach.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  const userId = (session.user as { id?: string }).id!;
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const input = parsed.data;

  // Aktywne podmioty ankietera (może być w kilku — wybieramy pierwszy aktywny jako "mój")
  const myMembership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { entityId: true, role: true },
  });

  // Pula kandydatów: nazwa fuzzy w obrębie gminy
  const candidates = await prisma.senior.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { firstName: { contains: input.firstName, mode: "insensitive" } },
        { lastName: { contains: input.lastName, mode: "insensitive" } },
      ],
    },
    take: 80,
    select: {
      id: true,
      pseudonimId: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      city: true,
      phone: true,
      email: true,
      peselHash: true,
      assignments: {
        where: { isActive: true },
        select: { surveyorUserId: true, entityId: true },
      },
      surveys: {
        select: {
          createdAt: true,
          careLevel: true,
          surveyorEntity: { select: { type: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Jeśli PESEL — odrzuć kandydatów których hash się nie zgadza,
  // przy zachowaniu kandydatów którzy NIE mają PESEL hash (mogą być powiązani datą urodzenia).
  const peselOk: string[] = [];
  if (input.pesel) {
    for (const c of candidates) {
      if (!c.peselHash) continue;
      const ok = await comparePesel(input.pesel, c.peselHash);
      if (ok) peselOk.push(c.id);
    }
  }

  const scored: PatientSearchHit[] = candidates
    .map((c) => {
      const sim = scoreSeniorMatch(
        {
          firstName: c.firstName,
          lastName: c.lastName,
          dateOfBirth: c.dateOfBirth,
          city: c.city,
          phone: c.phone,
          email: c.email,
        },
        input,
      );
      if (sim < 0.55) return null;

      let circle: SearchCircle = "SYSTEM";
      if (myMembership) {
        const mine = c.assignments.some(
          (a) => a.surveyorUserId === userId && a.entityId === myMembership.entityId,
        );
        const inEntity = c.assignments.some((a) => a.entityId === myMembership.entityId);
        if (mine) circle = "MINE";
        else if (inEntity) circle = "ENTITY";
      }

      // Bonus za zgodny PESEL hash (ANK-07: silne dopasowanie)
      const peselBoost = input.pesel && peselOk.includes(c.id) ? 0.3 : 0;

      const last = c.surveys[0];
      return {
        seniorId: c.id,
        pseudonimId: c.pseudonimId,
        firstName: c.firstName,
        lastName: c.lastName,
        dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().slice(0, 10) : null,
        city: c.city,
        similarity: Math.min(1, sim + peselBoost),
        circle,
        lastSurvey: last
          ? {
              date: last.createdAt.toISOString().slice(0, 10),
              careLevel: last.careLevel,
              entityType: last.surveyorEntity?.type ?? null,
            }
          : null,
      } as PatientSearchHit;
    })
    .filter((x): x is PatientSearchHit => x !== null)
    .sort((a, b) => {
      // Najpierw MINE > ENTITY > SYSTEM, wewnątrz wg similarity desc
      const order: Record<SearchCircle, number> = { MINE: 0, ENTITY: 1, SYSTEM: 2 };
      if (order[a.circle] !== order[b.circle]) return order[a.circle] - order[b.circle];
      return b.similarity - a.similarity;
    })
    .slice(0, 20);

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    organizationId: orgId,
    action: "VIEW",
    resource: "patient_search",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      query: { firstName: input.firstName, lastName: input.lastName, hasPesel: !!input.pesel },
      hits: scored.length,
    },
  });

  return NextResponse.json({ success: true, data: scored });
}
