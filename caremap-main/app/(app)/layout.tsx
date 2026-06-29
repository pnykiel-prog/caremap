import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/logowanie");
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: (session.user as { role?: string }).role,
    organizationName: (session.user as { organizationName?: string }).organizationName,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
