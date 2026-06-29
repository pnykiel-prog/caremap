import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function AnkieterLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/logowanie");

  const userId = (session.user as { id?: string }).id!;
  const membership = await prisma.surveyorMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { entity: true },
  });

  if (!membership) {
    redirect("/auth/redirect?ctx=jst");
  }

  return (
    <PortalShell
      variant="ankieter"
      title="Portal ankietera"
      subtitle={membership.entity.name}
      userName={session.user.name ?? undefined}
      entityName={membership.entity.name}
    >
      {children}
    </PortalShell>
  );
}
