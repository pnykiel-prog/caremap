import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/");
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const settings = await prisma.organizationSettings.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId },
    update: {},
  });
  const org = await prisma.organization.findUnique({ where: { id: orgId } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Ustawienia gminy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {org?.name} · konfiguracja powiadomień, automatycznych raportów i interwałów re-ankiet.
        </p>
      </div>
      <Card className="bg-white">
        <CardContent className="p-6">
          <SettingsForm initial={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
