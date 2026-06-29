import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle2, XCircle, Clock } from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ZaproszeniaPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE", role: "ENTITY_MANAGER" },
    select: { entityId: true },
  });
  const entityId = membership!.entityId;

  const invitations = await prisma.entityInvitation.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Zaproszenia pracowników</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historia wysłanych zaproszeń. Generuj nowe w zakładce „Ankieterzy".
        </p>
      </div>

      <Card className="bg-white">
        <CardContent className="p-0">
          {invitations.length === 0 ? (
            <div className="p-10 text-center">
              <Mail className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Brak zaproszeń.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invitations.map((inv) => {
                const used = !!inv.acceptedAt;
                const expired = !used && inv.expiresAt < new Date();
                const Icon = used ? CheckCircle2 : expired ? XCircle : Clock;
                const cls = used
                  ? "text-green-600"
                  : expired
                  ? "text-red-600"
                  : "text-[#C9A84C]";
                return (
                  <div
                    key={inv.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={18} className={cls + " flex-shrink-0"} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1e3a5f] truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.role === "ENTITY_MANAGER" ? "Manager" : "Ankieter"} · wysłano{" "}
                          {fmt(inv.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-right text-muted-foreground whitespace-nowrap">
                      {used && <span className="text-green-600">Aktywowane {fmt(inv.acceptedAt!)}</span>}
                      {!used && expired && <span className="text-red-600">Wygasło</span>}
                      {!used && !expired && <span>Wygasa {fmt(inv.expiresAt)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
