import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ChevronRight, AlertTriangle } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  POZ: "POZ / przychodnia",
  CUS: "Centrum Usług Środowiskowych",
  CARE_COMPANY: "Firma opieki domowej",
  NGO: "NGO / Wolontariat",
  HOSPICE: "Hospicjum",
  OTHER: "Inny podmiot",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Oczekuje", cls: "bg-orange-100 text-orange-700" },
  ACTIVE: { label: "Aktywny", cls: "bg-green-100 text-green-700" },
  SUSPENDED: { label: "Zawieszony", cls: "bg-red-100 text-red-700" },
};

export default async function AnkieterzyJstPage() {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;

  const links = await prisma.surveyorEntityGmina.findMany({
    where: { organizationId: orgId },
    include: { entity: { include: { memberships: { select: { id: true } } } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pending = links.filter((l) => l.status === "PENDING");
  const active = links.filter((l) => l.status === "ACTIVE");
  const suspended = links.filter((l) => l.status === "SUSPENDED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Podmioty ankietujące</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profesjonalne podmioty (POZ, CUS, firmy opieki) działające w Twojej gminie. Każdy podmiot
          wymaga zatwierdzenia przed rozpoczęciem pracy.
        </p>
      </div>

      {/* Oczekujące — żółty baner */}
      {pending.length > 0 && (
        <Card className="bg-[#C9A84C]/10 border-2 border-[#C9A84C]/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#C9A84C] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1e3a5f]">
                {pending.length} oczekujących wniosków rejestracyjnych
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Wymagana decyzja administratora gminy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {[
        { title: "Oczekujące wnioski", items: pending },
        { title: "Aktywne podmioty", items: active },
        { title: "Zawieszone / odrzucone", items: suspended },
      ].map((section) =>
        section.items.length === 0 ? null : (
          <div key={section.title}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {section.title} ({section.items.length})
            </p>
            <Card className="bg-white overflow-hidden">
              <div className="divide-y divide-border">
                {section.items.map((l) => (
                  <Link
                    key={l.id}
                    href={`/ankieterzy/${l.entityId}`}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                        <Building2 size={16} className="text-[#1e3a5f]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1e3a5f] truncate">
                          {l.entity.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {TYPE_LABEL[l.entity.type] ?? l.entity.type} ·{" "}
                          {l.entity.memberships.length} pracowników
                          {l.entity.city ? ` · ${l.entity.city}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_LABEL[l.status].cls}`}
                      >
                        {STATUS_LABEL[l.status].label}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        ),
      )}

      {links.length === 0 && (
        <Card className="bg-white">
          <CardContent className="p-10 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Żaden podmiot ankietujący nie aplikował jeszcze do Twojej gminy.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
