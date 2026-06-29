import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const registerSchema = z.object({
  // Dane podmiotu
  name: z.string().min(2),
  type: z.enum(["POZ", "CUS", "CARE_COMPANY", "NGO", "HOSPICE", "OTHER"]),
  nip: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  description: z.string().optional().nullable(),

  // Gminy w których podmiot chce działać (P-12) — slugs lub IDs
  organizationIds: z.array(z.string()).min(1),

  // Dane managera kontaktowego (jeszcze nie loguje się — przed zatwierdzeniem)
  contactManagerName: z.string().min(2),
  contactManagerEmail: z.string().email(),
});

/**
 * Publiczna rejestracja nowego podmiotu profesjonalnego (ANK-06 etap 1).
 * Tworzy SurveyorEntity ze statusem PENDING + powiązania z gminami (też PENDING).
 * Następnie JST admin każdej gminy zatwierdza osobno.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Nieprawidłowe dane formularza" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Sprawdź czy gminy istnieją
    const orgs = await prisma.organization.findMany({
      where: { id: { in: data.organizationIds } },
      select: { id: true },
    });
    if (orgs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nie znaleziono żadnej z wybranych gmin" },
        { status: 400 },
      );
    }

    const entity = await prisma.surveyorEntity.create({
      data: {
        name: data.name,
        type: data.type,
        nip: data.nip,
        address: data.address,
        postalCode: data.postalCode,
        city: data.city,
        phone: data.phone,
        email: data.email,
        description: data.description,
        contactManagerName: data.contactManagerName,
        contactManagerEmail: data.contactManagerEmail,
        status: "PENDING",
        gminaLinks: {
          create: orgs.map((o) => ({
            organizationId: o.id,
            status: "PENDING",
          })),
        },
      },
    });

    const meta = extractRequestMeta(req);
    await logAccess({
      action: "CREATE",
      resource: "surveyor_entity",
      resourceId: entity.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: {
        type: data.type,
        gminy: orgs.map((o) => o.id),
        contactManagerEmail: data.contactManagerEmail,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: entity.id, status: entity.status },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Błąd podczas rejestracji podmiotu" },
      { status: 500 },
    );
  }
}

/**
 * Publiczna lista gmin dla formularza rejestracji (dropdown).
 */
export async function GET() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, city: true, slug: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ success: true, data: orgs });
}
