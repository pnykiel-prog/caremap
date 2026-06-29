import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export default async function AnkieterKontoPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { name: true } } },
    }),
    prisma.surveyorMembership.findMany({
      where: { userId, status: "ACTIVE" },
      include: { entity: { select: { name: true, type: true } } },
    }),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Moje konto</h1>
        <p className="text-sm text-muted-foreground mt-1">Dane Twojego konta w systemie CareMap.</p>
      </div>

      <Card className="bg-white">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Imię i nazwisko</p>
            <p className="font-medium text-[#1e3a5f]">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
            <p className="font-medium text-[#1e3a5f]">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Telefon</p>
            <p className="font-medium text-[#1e3a5f]">{user.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Gmina</p>
            <p className="font-medium text-[#1e3a5f]">{user.organization?.name ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Moje podmioty</p>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak aktywnych przynależności.</p>
          ) : (
            <div className="space-y-2">
              {memberships.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1e3a5f]">{m.entity.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.entity.type} ·{" "}
                      {m.role === "ENTITY_MANAGER" ? "Manager" : "Ankieter"}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Aktywny
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
