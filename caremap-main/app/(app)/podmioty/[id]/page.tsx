import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Phone, Mail, Globe, MapPin, Users, Calendar } from "lucide-react";

const coverageLabel: Record<string, string> = {
  ADDRESS_ONLY: "Placówka stacjonarna",
  RADIUS: "Usługa mobilna (promień km)",
  CITY_LIST: "Usługa mobilna (lista gmin)",
};

const availStatusCfg: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Dostępny", cls: "bg-green-100 text-green-700" },
  LIMITED: { label: "Ograniczona dostępność", cls: "bg-yellow-100 text-yellow-700" },
  FULL: { label: "Brak wolnych miejsc", cls: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Działalność zawieszona", cls: "bg-gray-100 text-gray-500" },
};

export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/logowanie");
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  const provider = await prisma.provider.findFirst({ where: { id, organizationId: orgId } });
  if (!provider) notFound();

  const today = new Date().toISOString().split("T")[0];
  const [services, todayAvail, recentAvail] = await Promise.all([
    prisma.providerService.findMany({ where: { providerId: id } }),
    prisma.providerAvailability.findUnique({ where: { providerId_date: { providerId: id, date: today } } }),
    prisma.providerAvailability.findMany({
      where: { providerId: id },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  const cities = provider.coverageCities as string[] | null;
  const availCfg = todayAvail ? availStatusCfg[todayAvail.status] : null;

  const priceUnit: Record<string, string> = { miesiac: "mies.", godzina: "godz.", doba: "dobę" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/podmioty"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f] transition-colors"
        >
          <ChevronLeft size={16} />
          Podmioty
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-[#1e3a5f] truncate">{provider.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{provider.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{provider.type}</p>
        </div>
        {availCfg && (
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${availCfg.cls}`}>
            {availCfg.label}
            {todayAvail?.freePlaces ? ` · ${todayAvail.freePlaces} miejsc` : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#1e3a5f]">Dane kontaktowe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  {provider.address && <p>{provider.address}</p>}
                  <p className="text-muted-foreground">{provider.city}{provider.postalCode ? `, ${provider.postalCode}` : ""}</p>
                </div>
              </div>
              {provider.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone size={16} className="text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${provider.phone}`} className="hover:text-[#1e3a5f]">{provider.phone}</a>
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${provider.email}`} className="hover:text-[#1e3a5f]">{provider.email}</a>
                </div>
              )}
              {provider.website && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Globe size={16} className="text-muted-foreground flex-shrink-0" />
                  <a href={provider.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#1e3a5f] truncate">
                    {provider.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          {services.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#1e3a5f]">Oferowane usługi</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3">
                      <p className="text-sm font-medium">{s.serviceCode}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.priceMin === 0 && s.priceMax === 0
                          ? "Bezpłatnie"
                          : s.priceMin === s.priceMax
                          ? `${s.priceMin} zł / ${priceUnit[s.priceUnit] ?? s.priceUnit}`
                          : `${s.priceMin}–${s.priceMax} zł / ${priceUnit[s.priceUnit] ?? s.priceUnit}`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {provider.description && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#1e3a5f]">Opis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">{provider.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Coverage */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1e3a5f]">Zasięg</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{coverageLabel[provider.coverageType]}</p>
              {provider.coverageType === "RADIUS" && provider.coverageRadius && (
                <p className="font-medium">{provider.coverageRadius} km od siedziby</p>
              )}
              {provider.coverageType === "CITY_LIST" && cities && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cities.map((city) => (
                    <span key={city} className="text-xs px-2 py-0.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]">
                      {city}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capacity */}
          {provider.capacity > 0 && (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                  <Users size={18} className="text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pojemność</p>
                  <p className="text-lg font-bold text-[#1e3a5f]">{provider.capacity} miejsc</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent availability */}
          {recentAvail.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
                  <Calendar size={14} />
                  Dostępność
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentAvail.map((a) => {
                  const cfg = availStatusCfg[a.status];
                  return (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{a.date}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
                        {cfg.label}
                        {a.freePlaces > 0 ? ` (${a.freePlaces})` : ""}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
