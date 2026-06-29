import { prisma } from "@/lib/prisma";

export type PortalContext = "jst" | "senior" | "surveyor" | "manager";

const JST_ROLES = new Set([
  "ADMIN",
  "MUNICIPALITY_WORKER",
  "SOCIAL_WORKER",
  "NURSE",
  "GP_DOCTOR",
  "NGO_COORDINATOR",
  "VOLUNTEER",
]);

// Mapowanie kontekstu na ścieżkę docelową
export function portalPath(ctx: PortalContext): string {
  switch (ctx) {
    case "senior":
      return "/portal/senior";
    case "surveyor":
      return "/portal/ankieter";
    case "manager":
      return "/portal/manager";
    case "jst":
    default:
      return "/";
  }
}

// Wybór najlepszego portalu dla użytkownika.
// Honoruje ctxHint (z ekranu logowania) jeśli użytkownik faktycznie ma do niego prawo.
export async function resolvePortalForUser(
  userId: string,
  ctxHint?: string | null,
): Promise<PortalContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, additionalRoles: true, activeContext: true },
  });
  if (!user) return "jst";

  const memberships = await prisma.surveyorMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: { role: true },
  });
  const isManager = memberships.some((m) => m.role === "ENTITY_MANAGER");
  const isSurveyor = memberships.some((m) => m.role === "ENTITY_SURVEYOR");

  const ownsSenior = await prisma.senior.findFirst({
    where: { ownerUserId: userId },
    select: { id: true },
  });

  const isSeniorRole =
    user.role === "SENIOR" ||
    user.role === "FAMILY_CAREGIVER" ||
    user.additionalRoles.includes("SENIOR") ||
    user.additionalRoles.includes("FAMILY_CAREGIVER") ||
    !!ownsSenior;

  // 1. Honoruj ctxHint, jeśli pasuje do dostępnych kontekstów
  const hint = (ctxHint ?? user.activeContext) as PortalContext | undefined;
  if (hint === "manager" && isManager) return "manager";
  if (hint === "surveyor" && isSurveyor) return "surveyor";
  if (hint === "senior" && isSeniorRole) return "senior";
  if (hint === "jst" && JST_ROLES.has(user.role)) return "jst";

  // 2. Domyślne preferencje: manager > surveyor > jst > senior
  if (isManager) return "manager";
  if (isSurveyor) return "surveyor";
  if (JST_ROLES.has(user.role)) return "jst";
  if (isSeniorRole) return "senior";

  return "jst";
}
