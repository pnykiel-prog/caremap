import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPesel, isValidPesel, scoreSeniorMatch } from "@/lib/senior-identify";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const rowSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format daty: YYYY-MM-DD"),
  gender: z.enum(["K", "M"]).optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  pesel: z.string().optional().nullable(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
  /** Czy dodawać rekordy mimo wykrytych podobnych (silne dopasowanie). */
  forceCreate: z.boolean().default(false),
});

interface ImportResultRow {
  rowIndex: number;
  status: "CREATED" | "SKIPPED_DUPLICATE" | "ERROR";
  seniorId?: string;
  error?: string;
  matchedSeniorId?: string;
  matchedName?: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "MUNICIPALITY_WORKER" && role !== "SOCIAL_WORKER")
    return NextResponse.json({ success: false, error: "Brak uprawnień do importu" }, { status: 403 });

  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const userId = (session.user as { id?: string }).id!;

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results: ImportResultRow[] = [];

  // Wczytaj istniejących seniorów raz (do detekcji duplikatów)
  const existing = await prisma.senior.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      city: true,
      phone: true,
      email: true,
    },
  });

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    try {
      // PESEL — opcjonalny, ale jeśli podany musi mieć poprawną sumę kontrolną
      let peselHash: string | null = null;
      if (row.pesel && row.pesel.trim().length > 0) {
        if (!isValidPesel(row.pesel)) {
          results.push({
            rowIndex: i,
            status: "ERROR",
            error: "Nieprawidłowy PESEL (suma kontrolna)",
          });
          continue;
        }
        peselHash = await hashPesel(row.pesel);
      }

      // Wykryj duplikat (high similarity = >0.85 z dopasowaną datą urodzenia)
      if (!parsed.data.forceCreate) {
        const match = existing
          .map((c) => ({
            c,
            score: scoreSeniorMatch(
              {
                firstName: c.firstName,
                lastName: c.lastName,
                dateOfBirth: c.dateOfBirth,
                city: c.city,
                phone: c.phone,
                email: c.email,
              },
              {
                firstName: row.firstName,
                lastName: row.lastName,
                dateOfBirth: row.dateOfBirth,
                city: row.city ?? undefined,
                phone: row.phone ?? undefined,
                email: row.email ?? undefined,
              },
            ),
          }))
          .sort((a, b) => b.score - a.score)[0];

        if (match && match.score >= 0.85) {
          results.push({
            rowIndex: i,
            status: "SKIPPED_DUPLICATE",
            matchedSeniorId: match.c.id,
            matchedName: `${match.c.firstName} ${match.c.lastName}`,
          });
          continue;
        }
      }

      const created = await prisma.senior.create({
        data: {
          organizationId: orgId,
          firstName: row.firstName,
          lastName: row.lastName,
          dateOfBirth: new Date(row.dateOfBirth),
          gender: row.gender ?? null,
          address: row.address ?? null,
          postalCode: row.postalCode ?? null,
          city: row.city ?? null,
          phone: row.phone ?? null,
          email: row.email && row.email.length > 0 ? row.email : null,
          peselHash,
          pseudonimId: `psd_${randomUUID().replace(/-/g, "")}`,
          identificationConfidence: peselHash ? "NAME_DOB_EXTRA" : "NEW_RECORD",
        },
      });
      results.push({ rowIndex: i, status: "CREATED", seniorId: created.id });
    } catch (err) {
      results.push({
        rowIndex: i,
        status: "ERROR",
        error: err instanceof Error ? err.message : "Błąd bazy danych",
      });
    }
  }

  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === "CREATED").length,
    skipped: results.filter((r) => r.status === "SKIPPED_DUPLICATE").length,
    errors: results.filter((r) => r.status === "ERROR").length,
  };

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    organizationId: orgId,
    action: "CREATE",
    resource: "senior_bulk_import",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { ...summary, forceCreate: parsed.data.forceCreate },
  });

  return NextResponse.json({ success: true, data: { results, summary } });
}
