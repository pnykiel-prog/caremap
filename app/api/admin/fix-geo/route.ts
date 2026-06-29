import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// One-time endpoint to set Rzeszów coordinates on demo data
// Call once: GET /api/admin/fix-geo

const SENIOR_COORDS: Record<string, { lat: number; lon: number; city: string }> = {
  "senior-1": { lat: 50.0395, lon: 21.9993, city: "Rzeszów" },
  "senior-2": { lat: 50.0512, lon: 22.0178, city: "Rzeszów" },
  "senior-3": { lat: 50.0234, lon: 22.0312, city: "Rzeszów" },
  "senior-4": { lat: 50.0651, lon: 21.9876, city: "Rzeszów" },
  "senior-5": { lat: 50.0421, lon: 22.0089, city: "Rzeszów" },
};

const PROVIDER_COORDS: Record<string, { lat: number; lon: number; city: string }> = {
  "provider-1": { lat: 50.0412, lon: 22.0001, city: "Rzeszów" },
  "provider-2": { lat: 50.0445, lon: 22.0156, city: "Rzeszów" },
  "provider-3": { lat: 50.0367, lon: 21.9923, city: "Rzeszów" },
  "provider-4": { lat: 50.0631, lon: 21.9956, city: "Rzeszów" },
  "provider-5": { lat: 50.0490, lon: 22.0112, city: "Rzeszów" },
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Tylko administrator" }, { status: 403 });

  const results: string[] = [];

  for (const [id, coords] of Object.entries(SENIOR_COORDS)) {
    try {
      await prisma.senior.update({
        where: { id },
        data: { geoLat: coords.lat, geoLon: coords.lon, city: coords.city },
      });
      results.push(`senior ${id}: OK`);
    } catch {
      results.push(`senior ${id}: not found`);
    }
  }

  for (const [id, coords] of Object.entries(PROVIDER_COORDS)) {
    try {
      await prisma.provider.update({
        where: { id },
        data: { geoLat: coords.lat, geoLon: coords.lon, city: coords.city },
      });
      results.push(`provider ${id}: OK`);
    } catch {
      results.push(`provider ${id}: not found`);
    }
  }

  return NextResponse.json({ success: true, results });
}
