import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import {
  Plus,
  Filter,
  X,
  ClipboardList,
  AlertTriangle,
  Building2,
  TrendingUp,
  UserCog,
  ChevronRight,
  Calendar,
  MapPin,
  BarChart3,
  Users,
} from "lucide-react";

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
}

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
  level?: string;
  entityId?: string;
  surveyorUserId?: string;
}

export default async function AnkietaPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const session = await auth();
  const orgId = (session!.user as { organizationId?: string }).organizationId!;
  const sp = await searchParams;

  // ─── Senior-side filter (matches /seniorzy) ─────────────────────────────
  const seniorWhere: {
    organizationId: string;
    firstName?: ContainsFilter;
    lastName?: ContainsFilter;
    address?: ContainsFilter;
    city?: ContainsFilter;
    phone?: ContainsFilter;
    email?: ContainsFilter;
    dateOfBirth?: { gte?: Date; lt?: Date };
  } = { organizationId: orgId };

  if (sp.firstName?.trim()) seniorWhere.firstName = contains(sp.firstName.trim());
  if (sp.lastName?.trim()) seniorWhere.lastName = contains(sp.lastName.trim());
  if (sp.address?.trim()) seniorWhere.address = contains(sp.address.trim());
  if (sp.city?.trim()) seniorWhere.city = contains(sp.city.trim());
  if (sp.phone?.trim()) seniorWhere.phone = contains(sp.phone.trim());
  if (sp.email?.trim()) seniorWhere.email = contains(sp.email.trim());
  if (sp.dateOfBirth?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(sp.dateOfBirth.trim())) {
    const d = new Date(sp.dateOfBirth.trim());
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    seniorWhere.dateOfBirth = { gte: d, lt: next };
  } else if (sp.yearOfBirth?.trim() && /^\d{4}$/.test(sp.yearOfBirth.trim())) {
    const y = parseInt(sp.yearOfBirth.trim());
    seniorWhere.dateOfBirth = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
  }

  const hasSeniorFilter =
    !!sp.firstName?.trim() ||
    !!sp.lastName?.trim() ||
    !!sp.dateOfBirth?.trim() ||
    !!sp.yearOfBirth?.trim() ||
    !!sp.address?.trim() ||
    !!sp.city?.trim() ||
    !!sp.phone?.trim() ||
    !!sp.email?.trim();

  // ─── Survey-side filter ──────────────────────────────────────────────────
  const surveyWhere: {
    organizationId: string;
    careLevel?: number;
    surveyorEntityId?: string | null;
    surveyorUserId?: string;
    seniorId?: { in: string[] };
  } = { organizationId: orgId };

  if (sp.level && /^[1-7]$/.test(sp.level)) {
    surveyWhere.careLevel = parseInt(sp.level);
  }
  if (sp.entityId) {
    surveyWhere.surveyorEntityId = sp.entityId;
  }
  if (sp.surveyorUserId) {
    surveyWhere.surveyorUserId = sp.surveyorUserId;
  }

  // Apply senior-side filter via subquery
  if (hasSeniorFilter) {
    const matchedSeniors = await prisma.senior.findMany({
      where: seniorWhere,
      select: { id: true },
    });
    surveyWhere.seniorId = { in: matchedSeniors.map((s) => s.id) };
  }

  const hasFilter = hasSeniorFilter || !!sp.level || !!sp.entityId || !!sp.surveyorUserId;

  // ─── Surveys (filtered) + KPI data ──────────────────────────────────────
  const [surveys, totalAll, openAlerts, entities, surveyors] = await Promise.all([
    prisma.survey.findMany({
      where: surveyWhere,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        senior: { select: { id: true, firstName: true, lastName: true, city: true, dateOfBirth: true } },
        surveyorEntity: { select: { id: true, name: true, type: true } },
        surveyorUser: { select: { id: true, name: true } },
      },
    }),
    prisma.survey.count({ where: { organizationId: orgId } }),
    prisma.alert.count({ where: { organizationId: orgId, status: "OPEN" } }),
    prisma.surveyorEntity.findMany({
      where: { gminaLinks: { some: { organizationId: orgId, status: "ACTIVE" } } },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { memberships: { some: { status: "ACTIVE" } } },
          { surveyorSurveys: { some: {} } },
          { filledSurveys: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        memberships: {
          where: { status: "ACTIVE" },
          select: { entity: { select: { id: true, name: true } }, role: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // ─── KPI ────────────────────────────────────────────────────────────────
  const filteredCount = surveys.length;
  const filteredAvgLevel =
    surveys.filter((s) => s.careLevel != null).length > 0
      ? Math.round(
          (surveys.reduce((acc, s) => acc + (s.careLevel ?? 0), 0) /
            surveys.filter((s) => s.careLevel != null).length) *
            10,
        ) / 10
      : null;
  const filteredHighRiskCount = surveys.filter((s) => (s.careLevel ?? 0) >= 6).length;
  const uniqueSurveyors = new Set(
    surveys.flatMap((s) => [s.surveyorUserId, s.surveyorEntityId]).filter(Boolean),
  ).size;

  // ─── Stats dla wybranego ankietera/podmiotu ─────────────────────────────
  let entityStats: {
    name: string;
    type: string;
    surveyCount: number;
    patientCount: number;
    employees: { id: string; name: string; role: string; surveyCount: number; patientCount: number }[];
  } | null = null;

  let userStats: {
    name: string;
    entityName: string | null;
    role: string | null;
    surveyCount: number;
    patientCount: number;
    avgLevel: number | null;
    highRiskCount: number;
  } | null = null;

  if (sp.entityId) {
    const entity = await prisma.surveyorEntity.findUnique({
      where: { id: sp.entityId },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (entity) {
      const [entSurveys, entPatients] = await Promise.all([
        prisma.survey.count({ where: { surveyorEntityId: entity.id, organizationId: orgId } }),
        prisma.patientAssignment.count({ where: { entityId: entity.id, isActive: true } }),
      ]);

      const employees = await Promise.all(
        entity.memberships.map(async (m) => {
          const [emp1, emp2] = await Promise.all([
            prisma.survey.count({ where: { surveyorEntityId: entity.id, surveyorUserId: m.user.id } }),
            prisma.patientAssignment.count({
              where: { entityId: entity.id, surveyorUserId: m.user.id, isActive: true },
            }),
          ]);
          return {
            id: m.user.id,
            name: m.user.name,
            role: m.role,
            surveyCount: emp1,
            patientCount: emp2,
          };
        }),
      );

      entityStats = {
        name: entity.name,
        type: entity.type,
        surveyCount: entSurveys,
        patientCount: entPatients,
        employees,
      };
    }
  } else if (sp.surveyorUserId) {
    const user = await prisma.user.findUnique({
      where: { id: sp.surveyorUserId },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { entity: { select: { name: true } } },
        },
      },
    });
    if (user) {
      const userSurveys = await prisma.survey.findMany({
        where: { surveyorUserId: user.id, organizationId: orgId },
        select: { careLevel: true },
      });
      const userPatients = await prisma.patientAssignment.count({
        where: { surveyorUserId: user.id, isActive: true },
      });
      const avgL =
        userSurveys.filter((s) => s.careLevel != null).length > 0
          ? Math.round(
              (userSurveys.reduce((acc, s) => acc + (s.careLevel ?? 0), 0) /
                userSurveys.filter((s) => s.careLevel != null).length) *
                10,
            ) / 10
          : null;
      const highRisk = userSurveys.filter((s) => (s.careLevel ?? 0) >= 6).length;

      userStats = {
        name: user.name,
        entityName: user.memberships[0]?.entity.name ?? null,
        role: user.memberships[0]?.role ?? null,
        surveyCount: userSurveys.length,
        patientCount: userPatients,
        avgLevel: avgL,
        highRiskCount: highRisk,
      };
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Ankiety</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFilter ? (
              <>
                Wyniki filtrowania: <span className="font-semibold">{filteredCount}</span> z{" "}
                {totalAll}
              </>
            ) : (
              <>Kwestionariusze K1-K4 wypełnione dla seniorów ({totalAll} łącznie)</>
            )}
          </p>
        </div>
        <Link href="/ankieta/nowa">
          <Button className="bg-[#1e3a5f] hover:bg-[#152b47] text-white">
            <Plus size={16} className="mr-2" />
            Nowa ankieta
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ankiet w widoku"
          value={filteredCount}
          hint={hasFilter ? `z ${totalAll} ogółem` : "Wszystkie wypełnione"}
          icon={ClipboardList}
        />
        <KpiCard
          label="Średni poziom opieki"
          value={filteredAvgLevel ?? "—"}
          hint={filteredAvgLevel ? "Im wyżej, tym większa potrzeba opieki" : "Brak danych"}
          icon={TrendingUp}
        />
        <KpiCard
          label="Wysokie ryzyko"
          value={filteredHighRiskCount}
          hint="Poziom 6-7 (wymaga interwencji)"
          icon={AlertTriangle}
          accent={filteredHighRiskCount > 0}
        />
        <KpiCard
          label="Aktywne alerty"
          value={openAlerts}
          hint="Otwarte w całej gminie"
          icon={AlertTriangle}
          accent={openAlerts > 0}
        />
      </div>

      {/* Filter form */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <form className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Filter size={14} className="text-[#1e3a5f]" />
              <span className="font-semibold text-[#1e3a5f]">Filtrowanie</span>
              <span className="text-xs text-muted-foreground">
                — wypełnij dowolne pola (możesz łączyć)
              </span>
            </div>

            {/* Senior-side: same as /seniorzy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FilterField name="firstName" label="Imię" value={sp.firstName} placeholder="np. Anna" />
              <FilterField name="lastName" label="Nazwisko" value={sp.lastName} placeholder="np. Kowalska" />
              <FilterField name="dateOfBirth" label="Data urodzenia" value={sp.dateOfBirth} type="date" />
              <FilterField
                name="yearOfBirth"
                label="lub rok urodzenia"
                value={sp.yearOfBirth}
                placeholder="np. 1945"
                inputMode="numeric"
              />
              <FilterField name="address" label="Adres" value={sp.address} placeholder="ul. Lipowa" />
              <FilterField name="city" label="Miasto" value={sp.city} placeholder="np. Solaris" />
              <FilterField name="phone" label="Telefon" value={sp.phone} placeholder="501..." />
              <FilterField name="email" label="Email" value={sp.email} placeholder="@..." />
            </div>

            {/* Survey-specific */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Poziom opieki</label>
                <select
                  name="level"
                  defaultValue={sp.level ?? ""}
                  className="w-full h-9 px-3 rounded-md border border-border bg-white text-sm"
                >
                  <option value="">Wszystkie poziomy</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                    <option key={l} value={l}>
                      Poziom {l} — {CARE_LEVELS[l as keyof typeof CARE_LEVELS].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Podmiot ankietujący
                </label>
                <select
                  name="entityId"
                  defaultValue={sp.entityId ?? ""}
                  className="w-full h-9 px-3 rounded-md border border-border bg-white text-sm"
                >
                  <option value="">Wszystkie podmioty</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Ankieter (osoba)</label>
                <select
                  name="surveyorUserId"
                  defaultValue={sp.surveyorUserId ?? ""}
                  className="w-full h-9 px-3 rounded-md border border-border bg-white text-sm"
                >
                  <option value="">Wszyscy ankieterzy</option>
                  {surveyors.map((u) => {
                    const ent = u.memberships[0]?.entity.name;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {ent ? ` · ${ent}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" size="sm" className="bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                Zastosuj filtry
              </Button>
              {hasFilter && (
                <Link
                  href="/ankieta"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#1e3a5f]"
                >
                  <X size={12} /> Wyczyść
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Statystyki wybranego podmiotu */}
      {entityStats && (
        <Card className="bg-white border-2 border-[#1e3a5f]/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                  <Building2 size={20} className="text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-base font-bold text-[#1e3a5f]">{entityStats.name}</p>
                  <p className="text-xs text-muted-foreground">{entityStats.type}</p>
                </div>
              </div>
              <Link
                href={`/ankieterzy/${sp.entityId}`}
                className="text-xs text-[#1e3a5f] hover:underline whitespace-nowrap"
              >
                Profil podmiotu →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <MiniStat label="Wszystkie ankiety podmiotu" value={entityStats.surveyCount} />
              <MiniStat label="Aktywni pacjenci" value={entityStats.patientCount} />
              <MiniStat label="Pracownicy aktywni" value={entityStats.employees.length} />
              <MiniStat
                label="Ankiety na pracownika"
                value={
                  entityStats.employees.length > 0
                    ? Math.round((entityStats.surveyCount / entityStats.employees.length) * 10) / 10
                    : "—"
                }
              />
            </div>
            {entityStats.employees.length > 0 && (
              <>
                <p className="text-xs font-semibold text-[#1e3a5f] mb-2 uppercase tracking-wider">
                  Pracownicy podmiotu
                </p>
                <div className="divide-y divide-border border border-border rounded-lg">
                  {entityStats.employees.map((e) => (
                    <div
                      key={e.id}
                      className="px-3 py-2 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCog size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-[#1e3a5f] truncate">{e.name}</span>
                        <span className="text-[10px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                          {e.role === "ENTITY_MANAGER" ? "Manager" : "Ankieter"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span><strong className="text-[#1e3a5f]">{e.patientCount}</strong> pacjentów</span>
                        <span><strong className="text-[#1e3a5f]">{e.surveyCount}</strong> ankiet</span>
                        <Link
                          href={`/ankieta?surveyorUserId=${e.id}`}
                          className="text-[#1e3a5f] hover:underline"
                        >
                          Pokaż
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statystyki wybranego ankietera */}
      {userStats && (
        <Card className="bg-white border-2 border-[#1e3a5f]/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                  <UserCog size={20} className="text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-base font-bold text-[#1e3a5f]">{userStats.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {userStats.entityName ?? "Pracownik gminy"}
                    {userStats.role && (
                      <> · {userStats.role === "ENTITY_MANAGER" ? "Manager" : "Ankieter"}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="Wypełnione ankiety" value={userStats.surveyCount} />
              <MiniStat label="Aktywni pacjenci" value={userStats.patientCount} />
              <MiniStat label="Średni poziom" value={userStats.avgLevel ?? "—"} />
              <MiniStat
                label="Wysokie ryzyko"
                value={userStats.highRiskCount}
                accent={userStats.highRiskCount > 0}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista ankiet */}
      {surveys.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-10 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {hasFilter ? "Brak ankiet pasujących do filtrów." : "Brak ankiet."}
            </p>
            {!hasFilter && (
              <Link href="/ankieta/nowa" className="inline-block mt-4">
                <Button className="bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                  Rozpocznij pierwszą ankietę
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {surveys.map((s) => {
                const cfg = s.careLevel
                  ? CARE_LEVELS[s.careLevel as keyof typeof CARE_LEVELS]
                  : null;
                const sourceLabel = s.surveyorEntity
                  ? `${s.surveyorEntity.name}`
                  : "Pracownik gminy";
                return (
                  <Link
                    key={s.id}
                    href={`/ankieta/${s.id}/wyniki`}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[#1e3a5f]">
                          {s.senior.firstName[0]}
                          {s.senior.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1e3a5f] truncate">
                          {s.senior.firstName} {s.senior.lastName}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={11} />
                            {fmt(s.createdAt)}
                          </span>
                          {s.senior.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} />
                              {s.senior.city}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Users size={11} />
                            {sourceLabel}
                            {s.surveyorUser && <> · {s.surveyorUser.name}</>}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {cfg && s.careLevel && (
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          P. {s.careLevel}
                        </span>
                      )}
                      <BarChart3 size={14} className="text-muted-foreground" />
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {surveys.length === 200 && (
        <p className="text-xs text-muted-foreground text-center">
          Pokazano pierwsze 200 wyników. Zawęź filtry, żeby zobaczyć więcej.
        </p>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: boolean;
}) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              accent ? "bg-[#C9A84C]/10" : "bg-[#1e3a5f]/10"
            }`}
          >
            <Icon size={14} className={accent ? "text-[#C9A84C]" : "text-[#1e3a5f]"} />
          </div>
        </div>
        <p className="text-2xl font-bold text-[#1e3a5f]">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-[#C9A84C]" : "text-[#1e3a5f]"}`}>{value}</p>
    </div>
  );
}

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
