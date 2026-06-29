import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function SeniorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/logowanie");

  return (
    <PortalShell
      variant="senior"
      title="Portal seniora"
      userName={session.user.name ?? undefined}
    >
      {children}
    </PortalShell>
  );
}
