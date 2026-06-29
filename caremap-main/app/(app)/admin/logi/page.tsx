import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const ACTION_LABEL: Record<string, string> = {
  VIEW: "Podgląd",
  CREATE: "Utworzenie",
  UPDATE: "Edycja",
  DELETE: "Usunięcie",
  EXPORT: "Eksport",
  APPROVE: "Zatwierdzenie",
  REJECT: "Odrzucenie",
  SUSPEND: "Zawieszenie",
};

function fmt(d: Date): string {
  return new Date(d).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function AdminLogiPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/");
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const logs = await prisma.auditLog.findMany({
    where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-[#1e3a5f]" />
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Logi audytu (SEC-02)</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Ostatnie {logs.length} zdarzeń. Loguje się dostęp do danych wrażliwych (seniorzy, ankiety,
        alerty), akcje zatwierdzania podmiotów oraz zmiany ustawień gminy.
      </p>

      <Card className="bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F8FAFC] border-b border-border">
                <tr>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Czas</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Użytkownik</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Akcja</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">Zasób</th>
                  <th className="text-left p-3 font-semibold text-[#1e3a5f]">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-[#F8FAFC]">
                    <td className="p-3 text-muted-foreground whitespace-nowrap font-mono">
                      {fmt(l.createdAt)}
                    </td>
                    <td className="p-3">
                      {l.user ? (
                        <>
                          <p className="font-medium text-[#1e3a5f]">{l.user.name}</p>
                          <p className="text-muted-foreground">{l.user.email}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">Anonim</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-[#1e3a5f]">
                        {ACTION_LABEL[l.action] ?? l.action}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {l.resource}
                      {l.resourceId ? <span className="text-[10px]"> · {l.resourceId.slice(0, 8)}</span> : null}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono">{l.ip ?? "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Brak wpisów w logu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
