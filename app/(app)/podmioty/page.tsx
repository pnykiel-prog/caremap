import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus, AlertTriangle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ProviderListClient, { type ProviderItem, type AvailabilityItem } from "./ProviderListClient";
import { redirect } from "next/navigation";

export default async function PodmiotyPage() {
  const session = await auth();
  if (!session) redirect("/logowanie");
  const orgId   = (session.user as { organizationId?: string }).organizationId!;
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  // ── Providers ─────────────────────────────────────────────────────────────
  const providers = await prisma.provider.findMany({
    where:   { organizationId: orgId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const providerIds = providers.map((p) => p.id);

  // ── Services ──────────────────────────────────────────────────────────────
  const serviceRows = await prisma.providerService.findMany({
    where:  { providerId: { in: providerIds } },
    select: { providerId: true, serviceCode: true },
    orderBy: { serviceCode: "asc" },
  });
  const servicesByProvider: Record<string, string[]> = {};
  for (const s of serviceRows) {
    if (!servicesByProvider[s.providerId]) servicesByProvider[s.providerId] = [];
    servicesByProvider[s.providerId].push(s.serviceCode);
  }

  // ── Availability (today) ──────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const availabilities = await prisma.providerAvailability.findMany({
    where: { providerId: { in: providerIds }, date: today },
  });
  const availByProvider: Record<string, AvailabilityItem> = Object.fromEntries(
    availabilities.map((a) => [
      a.providerId,
      {
        providerId: a.providerId,
        status: a.status,
        freePlaces: a.freePlaces,
        notes: a.notes,
      },
    ])
  );

  // ── Serialize for client ──────────────────────────────────────────────────
  const providerItems: ProviderItem[] = providers.map((p) => ({
    id:             p.id,
    name:           p.name,
    type:           p.type,
    city:           p.city,
    address:        p.address,
    phone:          p.phone,
    status:         p.status,
    coverageType:   p.coverageType,
    coverageRadius: p.coverageRadius,
    coverageCities: p.coverageCities as string[] | null,
    capacity:       p.capacity,
    rejectionNote:  p.rejectionNote,
    services:       servicesByProvider[p.id] ?? [],
  }));

  const pendingCount = providers.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Podmioty opieki</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zarejestrowane podmioty opiekuńcze — {providers.length} łącznie ·{" "}
            <span className="italic">dostępność dzienną edytujesz w karcie każdego podmiotu</span>
          </p>
        </div>
        <Link
          href="/podmioty/rejestracja"
          className={cn(
            buttonVariants({ variant: "default" }),
            "bg-[#1e3a5f] hover:bg-[#152b47] text-white gap-2"
          )}
        >
          <Plus size={16} />
          Dodaj podmiot
        </Link>
      </div>

      {/* Pending banner (admin only) */}
      {isAdmin && pendingCount > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{pendingCount}</strong>{" "}
            {pendingCount === 1 ? "podmiot oczekuje" : "podmioty oczekują"} na zatwierdzenie przez administratora.
          </p>
        </div>
      )}

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground">Brak podmiotów</p>
        </div>
      ) : (
        <ProviderListClient
          providers={providerItems}
          availByProvider={availByProvider}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
