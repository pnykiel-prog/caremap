import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import {
  UserPlus,
  Users,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  ShieldCheck,
  ShieldOff,
  ClipboardList,
  BarChart3,
  Filter,
  X,
} from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
}

// QueryMode helper for Prisma 7 — case-insensitive contains
type ContainsFilter = { contains: string; mode: "insensitive" };
const contains = (v: string): ContainsFilter => ({ contains: v, mode: "insensitive" });

interface Filters {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  yearOfBirth?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export default async function SeniorzyListPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;
  const sp = await searchParams;

  // ─── Build where clause ────────────────────────────────────────────────────
  const where: {
    organizationId: string;
    firstName?: ContainsFilter;
    lastName?: ContainsFilter;
    address?: ContainsFilter;
    city?: ContainsFilter;
    phone?: ContainsFilter;
    email?: ContainsFilter;
    dateOfBirth?: { gte?: Date; lt?: Date };
  } = { organizationId: orgId };

  if (sp.firstName?.trim()) where.firstName = contains(sp.firstName.trim());
  if (sp.lastName?.trim()) where.lastName = contains(sp.lastName.trim());
  if (sp.address?.trim()) where.address = contains(sp.address.trim());
  if (sp.city?.trim()) where.city = contains(sp.city.trim());
  if (sp.phone?.trim()) where.phone = contains(sp.phone.trim());
  if (sp.email?.trim()) where.email = contains(sp.email.trim());

  // Data urodzenia: pełna data → exact day; rok → zakres
  if (sp.dateOfBirth?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(sp.dateOfBirth.trim())) {
    const d = new Date(sp.dateOfBirth.trim());
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    where.dateOfBirth = { gte: d, lt: next };
  } else if (sp.yearOfBirth?.trim() && /^\d{4}$/.test(sp.yearOfBirth.trim())) {
    const y = parseInt(sp.yearOfBirth.trim());
    where.dateOfBirth = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
  }

  const hasFilter =
    !!sp.firstName?.trim() ||
    !!sp.lastName?.trim() ||
    !!sp.dateOfBirth?.trim() ||
    !!sp.yearOfBirth?.trim() ||
    !!sp.address?.trim() ||
    !!sp.city?.trim() ||
    !!sp.phone?.trim() ||
    !!sp.email?.trim();

  const seniors = await prisma.senior.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
    include: {
      surveys: {
        orderBy: { createdAt: "desc" },
        select: { id: true, careLevel: true, createdAt: true, status: true },
      },
    },
  });

  const totalAll = await prisma.senior.count({ where: { organizationId: orgId } });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Seniorzy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFilter ? (
              <>
                Wyniki filtrowania: <span className="font-semibold">{seniors.length}</span> z {totalAll}
              </>
            ) : (
              <>{totalAll} osób w bazie</>
            )}
          </p>
        </div>
        <Link href="/seniorzy/nowy">
          <Button className="bg-[#1e3a5f] hover:bg-[#152b47] text-white w-full sm:w-auto">
            <UserPlus size={16} className="mr-2" />
            Dodaj seniora
          </Button>
        </Link>
      </div>

      {/* Filter form */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <form className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Filter size={14} className="text-[#1e3a5f]" />
              <span className="font-semibold text-[#1e3a5f]">Filtrowanie</span>
              <span className="text-xs text-muted-foreground">
                — wypełnij dowolne pole (lub kombinację)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FilterField name="firstName" label="Imię" value={sp.firstName} placeholder="np. Anna" />
              <FilterField name="lastName" label="Nazwisko" value={sp.lastName} placeholder="np. Kowalska" />
              <FilterField
                name="dateOfBirth"
                label="Data urodzenia"
                value={sp.dateOfBirth}
                type="date"
              />
              <FilterField
                name="yearOfBirth"
                label="lub rok urodzenia"
                value={sp.yearOfBirth}
                placeholder="np. 1945"
                inputMode="numeric"
              />
              <FilterField name="address" label="Adres (ulica)" value={sp.address} placeholder="ul. Lipowa" />
              <FilterField name="city" label="Miasto" value={sp.city} placeholder="np. Solaris" />
              <FilterField name="phone" label="Telefon" value={sp.phone} placeholder="501..." />
              <FilterField name="email" label="Email" value={sp.email} placeholder="@..." />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" size="sm" className="bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                Zastosuj filtry
              </Button>
              {hasFilter && (
                <Link
                  href="/seniorzy"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#1e3a5f]"
                >
                  <X size={12} /> Wyczyść
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      {seniors.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-10 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {hasFilter ? "Brak seniorów pasujących do filtrów." : "Brak seniorów w bazie."}
            </p>
            {!hasFilter && (
              <Link href="/seniorzy/nowy" className="inline-block mt-4">
                <Button className="bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                  Dodaj pierwszego seniora
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {seniors.map((s) => {
            const surveyCount = s.surveys.length;
            const lastSurvey = s.surveys[0];
            const lastCfg = lastSurvey?.careLevel
              ? CARE_LEVELS[lastSurvey.careLevel as keyof typeof CARE_LEVELS]
              : null;
            const hasPesel = !!s.peselHash;

            const ankietaHref =
              surveyCount > 0
                ? `/ankieta/${lastSurvey.id}/ponow`
                : `/ankieta/nowa?seniorId=${s.id}`;
            const wynikiHref = lastSurvey ? `/ankieta/${lastSurvey.id}/wyniki` : null;

            return (
              <Card key={s.id} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Avatar + nazwa */}
                    <div className="lg:col-span-3 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#1e3a5f]">
                          {s.firstName[0]}
                          {s.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[#1e3a5f] truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <CalendarDays size={11} />
                          ur. {fmt(s.dateOfBirth)}
                          {s.gender ? ` · ${s.gender === "K" ? "kobieta" : "mężczyzna"}` : ""}
                        </p>
                        <p
                          className={`text-[10px] mt-1 inline-flex items-center gap-1 ${
                            hasPesel ? "text-green-700" : "text-muted-foreground"
                          }`}
                        >
                          {hasPesel ? (
                            <>
                              <ShieldCheck size={11} /> PESEL zapisany (bcrypt)
                            </>
                          ) : (
                            <>
                              <ShieldOff size={11} /> Brak PESEL
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Kontakt */}
                    <div className="lg:col-span-4 space-y-1 text-sm">
                      <div className="flex items-start gap-1.5 text-muted-foreground">
                        <MapPin size={13} className="flex-shrink-0 mt-0.5" />
                        <span className="break-words">
                          {[s.address, s.postalCode, s.city].filter(Boolean).join(", ") || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone size={13} />
                        <span>{s.phone ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail size={13} />
                        <span className="truncate">{s.email ?? "—"}</span>
                      </div>
                    </div>

                    {/* Statystyki ankiet */}
                    <div className="lg:col-span-2 flex flex-col items-start lg:items-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Ankiety
                      </p>
                      <p className="text-2xl font-bold text-[#1e3a5f]">{surveyCount}</p>
                      {lastSurvey ? (
                        <>
                          {lastCfg && lastSurvey.careLevel && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
                              style={{ background: lastCfg.bg, color: lastCfg.color }}
                            >
                              Poziom {lastSurvey.careLevel}
                            </span>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Ostatnia: {fmt(lastSurvey.createdAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-1">brak badań</p>
                      )}
                    </div>

                    {/* Akcje */}
                    <div className="lg:col-span-3 flex flex-col gap-2">
                      {wynikiHref ? (
                        <Link href={wynikiHref}>
                          <Button
                            variant="outline"
                            className="w-full border-[#1e3a5f]/40 text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                          >
                            <BarChart3 size={14} className="mr-2" />
                            Wyniki
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          disabled
                          className="w-full opacity-50 cursor-not-allowed"
                          title="Brak wypełnionych ankiet"
                        >
                          <BarChart3 size={14} className="mr-2" />
                          Wyniki
                        </Button>
                      )}
                      <Link href={ankietaHref}>
                        <Button className="w-full bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                          <ClipboardList size={14} className="mr-2" />
                          {surveyCount > 0 ? "Ankieta ponownie" : "Pierwsza ankieta"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {seniors.length === 200 && (
        <p className="text-xs text-muted-foreground text-center">
          Pokazano pierwsze 200 wyników. Zawęź filtry, żeby zobaczyć więcej.
        </p>
      )}
    </div>
  );
}

// ─── Inline filter field component ─────────────────────────────────────────

function FilterField({
  name,
  label,
  value,
  placeholder,
  type = "text",
  inputMode,
}: {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="text-xs text-muted-foreground block mb-1">
        {label}
      </label>
      <Input
        id={`f-${name}`}
        name={name}
        type={type}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-9 text-sm"
      />
    </div>
  );
}
