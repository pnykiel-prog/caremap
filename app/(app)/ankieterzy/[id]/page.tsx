import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { EntityActions } from "./EntityActions";

const TYPE_LABEL: Record<string, string> = {
  POZ: "POZ / przychodnia",
  CUS: "Centrum Usług Środowiskowych",
  CARE_COMPANY: "Firma opieki domowej",
  NGO: "NGO / Wolontariat",
  HOSPICE: "Hospicjum",
  OTHER: "Inny podmiot",
};

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  const link = await prisma.surveyorEntityGmina.findUnique({
    where: { entityId_organizationId: { entityId: id, organizationId: orgId } },
    include: {
      entity: {
        include: {
          memberships: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!link) notFound();

  const surveyCount = await prisma.survey.count({
    where: { surveyorEntityId: id, organizationId: orgId },
  });
  const patientCount = await prisma.patientAssignment.count({
    where: { entityId: id, isActive: true },
  });

  return (
    <div className="space-y-5">
      <Link
        href="/ankieterzy"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Podmioty ankietujące
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
            <Building2 size={22} className="text-[#1e3a5f]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">{link.entity.name}</h1>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABEL[link.entity.type] ?? link.entity.type}
            </p>
          </div>
        </div>
        <EntityActions entityId={id} status={link.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-[#1e3a5f]">Dane kontaktowe</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={14} />
                <span>
                  {[link.entity.address, link.entity.postalCode, link.entity.city]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={14} />
                <span>{link.entity.phone ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground col-span-full">
                <Mail size={14} />
                <span>{link.entity.email ?? link.entity.contactManagerEmail ?? "—"}</span>
              </div>
              {link.entity.nip && (
                <p className="text-xs text-muted-foreground col-span-full">NIP: {link.entity.nip}</p>
              )}
            </div>
            {link.entity.description && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Opis działalności
                </p>
                <p className="text-sm text-foreground/80">{link.entity.description}</p>
              </div>
            )}
            {link.rejectionNote && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-red-600 uppercase tracking-wider mb-1">Adnotacja</p>
                <p className="text-sm text-red-700">{link.rejectionNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-[#1e3a5f]">Statystyki</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Pracowników</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{link.entity.memberships.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pacjentów</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{patientCount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Ankiet w tej gminie</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{surveyCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Pracownicy</p>
          {link.entity.memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak pracowników.</p>
          ) : (
            <div className="divide-y divide-border">
              {link.entity.memberships.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-[#1e3a5f]">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.role === "ENTITY_MANAGER" ? "Manager" : "Ankieter"} ·{" "}
                    {m.status === "ACTIVE" ? "Aktywny" : "Zawieszony"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
