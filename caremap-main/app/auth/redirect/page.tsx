import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { portalPath, resolvePortalForUser } from "@/lib/portal-routing";

export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ ctx?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/logowanie");

  // Jeśli przyszedł explicit callbackUrl (np. z proxy) i nie jest to korzeń — uszanuj
  if (sp.callbackUrl && sp.callbackUrl.startsWith("/") && sp.callbackUrl !== "/") {
    redirect(sp.callbackUrl);
  }

  const ctx = await resolvePortalForUser(session.user.id as string, sp.ctx ?? null);
  redirect(portalPath(ctx));
}
