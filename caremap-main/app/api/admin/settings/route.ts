import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMeta } from "@/lib/audit";

const schema = z.object({
  channelPush: z.boolean(),
  channelEmail: z.boolean(),
  channelSms: z.boolean(),
  autoSendPdfToSenior: z.boolean(),
  sendPdfOnlyIfConsent: z.boolean(),
  fallbackMopsName: z.string().nullable().optional(),
  fallbackMopsPhone: z.string().nullable().optional(),
  fallbackMopsEmail: z.string().email().nullable().optional(),
  reSurveyMonthsHigh: z.number().int().min(1).max(24),
  reSurveyMonthsMid: z.number().int().min(1).max(24),
  reSurveyMonthsLow: z.number().int().min(1).max(36),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN")
    return NextResponse.json({ success: false, error: "Brak uprawnień" }, { status: 403 });

  const orgId = (session!.user as { organizationId?: string }).organizationId!;
  const userId = (session!.user as { id?: string }).id!;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ success: false, error: "Nieprawidłowe dane" }, { status: 400 });

  await prisma.organizationSettings.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, ...parsed.data },
    update: parsed.data,
  });

  const meta = extractRequestMeta(req);
  await logAccess({
    userId,
    organizationId: orgId,
    action: "UPDATE",
    resource: "organization_settings",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json({ success: true });
}
