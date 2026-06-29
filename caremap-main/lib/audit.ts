import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { AuditAction } from "@/lib/generated/prisma/client";

type InputJson = Prisma.InputJsonValue;

interface LogInput {
  userId?: string | null;
  organizationId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  justification?: string | null;
  metadata?: unknown;
}

/**
 * SEC-02 — zapisuje wpis w AuditLog. Nie rzuca, żeby nie blokować flow biznesowego.
 * Używać w API hookach: dostęp do danych wrażliwych (Senior, Survey, Alert),
 * akcje zatwierdzania (Provider, SurveyorEntity), eksporty.
 */
export async function logAccess(input: LogInput): Promise<void> {
  try {
    const hasMeta = input.metadata !== undefined && input.metadata !== null;
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        organizationId: input.organizationId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        justification: input.justification ?? null,
        ...(hasMeta ? { metadata: input.metadata as InputJson } : {}),
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

/** Helper do wyciągania IP/User-Agent z Request w API route */
export function extractRequestMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent");
  return { ip, userAgent };
}
