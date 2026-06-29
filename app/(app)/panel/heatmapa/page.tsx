import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import MapPanelClient from "@/components/dashboard/MapPanelClient";
import { ChevronLeft } from "lucide-react";

export default async function HeatmapaPage() {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const seniorCount = await prisma.senior.count({
    where: { organizationId: orgId, geoLat: { not: null }, geoLon: { not: null } },
  });

  return (
    <div className="space-y-5">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Panel JST
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Heatmapa popytu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Geograficzne rozmieszczenie {seniorCount} seniorów z geolokalizacją. Kolor markera = poziom opieki.
        </p>
      </div>

      <Card className="bg-white">
        <CardContent className="p-0 overflow-hidden rounded-xl">
          <MapPanelClient />
        </CardContent>
      </Card>
    </div>
  );
}
