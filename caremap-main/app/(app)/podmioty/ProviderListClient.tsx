"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Building2, Phone, MapPin, ChevronRight,
  Search, X, ChevronDown, ChevronUp,
  CalendarCheck, PencilLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProviderActions from "./ProviderActions";
import AvailabilityForm from "./AvailabilityForm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProviderItem {
  id: string;
  name: string;
  type: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  status: string;
  coverageType: string;
  coverageRadius: number | null;
  coverageCities: string[] | null;
  capacity: number;
  rejectionNote: string | null;
  services: string[];
}

export interface AvailabilityItem {
  providerId: string;
  status: string;
  freePlaces: number | null;
  notes: string | null;
}

interface Props {
  providers: ProviderItem[];
  availByProvider: Record<string, AvailabilityItem>;
  isAdmin: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────────

const statusCfg: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: "Aktywny",    cls: "bg-green-100 text-green-700"   },
  PENDING:   { label: "Oczekujący", cls: "bg-yellow-100 text-yellow-700" },
  SUSPENDED: { label: "Zawieszony", cls: "bg-red-100 text-red-700"       },
};

const availStatusCfg: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Dostępny",    cls: "bg-green-100 text-green-700"   },
  LIMITED:   { label: "Ograniczony", cls: "bg-yellow-100 text-yellow-700" },
  FULL:      { label: "Brak miejsc", cls: "bg-red-100 text-red-700"       },
};

const coverageLabel: Record<string, string> = {
  ADDRESS_ONLY: "Stacjonarny",
  RADIUS:       "Mobilny (promień)",
  CITY_LIST:    "Mobilny (gminy)",
};

const COVERAGE_OPTS = [
  { value: "ADDRESS_ONLY", label: "Stacjonarny" },
  { value: "RADIUS",       label: "Mobilny – promień" },
  { value: "CITY_LIST",    label: "Mobilny – gminy" },
];

const AVAIL_OPTS = [
  { value: "AVAILABLE", label: "Dostępny",    cls: "text-green-700"  },
  { value: "LIMITED",   label: "Ograniczony", cls: "text-yellow-700" },
  { value: "FULL",      label: "Brak miejsc", cls: "text-red-700"    },
  { value: "NONE",      label: "Brak danych", cls: "text-gray-500"   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  colorFn,
  limit = 8,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  colorFn?: (v: string) => string;
  limit?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, limit);
  const hasMore = options.length > limit;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((opt) => {
          const active = selected.has(opt);
          const color  = colorFn ? colorFn(opt) : undefined;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                active
                  ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
              )}
              style={active && color ? { background: color, borderColor: color } : undefined}
            >
              {opt}
            </button>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-gray-500 flex items-center gap-1"
          >
            {showAll ? <><ChevronUp size={10} /> Mniej</> : <><ChevronDown size={10} /> +{options.length - limit} więcej</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProviderListClient({ providers, availByProvider, isAdmin }: Props) {
  // Filter state
  const [search,          setSearch]          = useState("");
  const [selectedTypes,   setSelectedTypes]   = useState<Set<string>>(new Set());
  const [selectedSvcs,    setSelectedSvcs]    = useState<Set<string>>(new Set());
  const [selectedStatus,  setSelectedStatus]  = useState<Set<string>>(new Set());
  const [selectedCoverage,setSelectedCoverage]= useState<Set<string>>(new Set());
  const [selectedAvail,   setSelectedAvail]   = useState<Set<string>>(new Set());

  // ── Derived option lists ──────────────────────────────────────────────────
  const allTypes = useMemo(
    () => [...new Set(providers.map((p) => p.type))].sort(),
    [providers]
  );
  const allServices = useMemo(
    () => [...new Set(providers.flatMap((p) => p.services))].sort(),
    [providers]
  );

  // ── Toggle helpers ────────────────────────────────────────────────────────
  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    setter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  // ── Clear all ─────────────────────────────────────────────────────────────
  function clearAll() {
    setSearch("");
    setSelectedTypes(new Set());
    setSelectedSvcs(new Set());
    setSelectedStatus(new Set());
    setSelectedCoverage(new Set());
    setSelectedAvail(new Set());
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedTypes.size > 0 ||
    selectedSvcs.size > 0 ||
    selectedStatus.size > 0 ||
    selectedCoverage.size > 0 ||
    selectedAvail.size > 0;

  // ── Filtering logic ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return providers.filter((p) => {
      // Text search
      if (q) {
        const hay = `${p.name} ${p.city ?? ""} ${p.address ?? ""} ${p.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Type
      if (selectedTypes.size > 0 && !selectedTypes.has(p.type)) return false;
      // Services (AND: all selected services must be present, OR: any match)
      if (selectedSvcs.size > 0 && !p.services.some((s) => selectedSvcs.has(s))) return false;
      // Status
      if (selectedStatus.size > 0 && !selectedStatus.has(p.status)) return false;
      // Coverage
      if (selectedCoverage.size > 0 && !selectedCoverage.has(p.coverageType)) return false;
      // Availability
      if (selectedAvail.size > 0) {
        const avail = availByProvider[p.id];
        const availKey = avail ? avail.status : "NONE";
        if (!selectedAvail.has(availKey)) return false;
      }
      return true;
    });
  }, [providers, search, selectedTypes, selectedSvcs, selectedStatus, selectedCoverage, selectedAvail, availByProvider]);

  // ── Grouping (only when no filters active) ────────────────────────────────
  const showGrouped = !hasActiveFilters;

  const pending   = filtered.filter((p) => p.status === "PENDING");
  const active    = filtered.filter((p) => p.status === "ACTIVE");
  const suspended = filtered.filter((p) => p.status === "SUSPENDED");

  const groupedSections = [
    ...(pending.length   > 0 ? [{ key: "pending",   label: "Oczekujące na zatwierdzenie", items: pending   }] : []),
    ...(active.length    > 0 ? [{ key: "active",    label: "Aktywne",                     items: active    }] : []),
    ...(suspended.length > 0 ? [{ key: "suspended", label: "Zawieszone / odrzucone",      items: suspended }] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Filter panel ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">

        {/* Search + clear */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj po nazwie, mieście, adresie, typie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <X size={12} />
              Wyczyść filtry
            </button>
          )}
        </div>

        {/* Chip filter groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rodzaj podmiotu */}
          <ChipGroup
            label="Rodzaj podmiotu"
            options={allTypes}
            selected={selectedTypes}
            onToggle={(v) => toggle(setSelectedTypes, v)}
          />
          {/* Zasięg */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zasięg działania</span>
            <div className="flex flex-wrap gap-1.5">
              {COVERAGE_OPTS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggle(setSelectedCoverage, value)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    selectedCoverage.has(value)
                      ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Usługi */}
        {allServices.length > 0 && (
          <ChipGroup
            label="Rodzaj usług"
            options={allServices}
            selected={selectedSvcs}
            onToggle={(v) => toggle(setSelectedSvcs, v)}
            limit={8}
          />
        )}

        {/* Status + Dostępność row */}
        <div className="flex flex-wrap gap-6">
          {/* Status */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {(["ACTIVE", "PENDING", "SUSPENDED"] as const).map((s) => {
                const cfg = statusCfg[s];
                const active = selectedStatus.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(setSelectedStatus, s)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                      active ? "bg-[#1e3a5f] border-[#1e3a5f] text-white" : `border-gray-200 bg-white ${cfg.cls} hover:border-[#1e3a5f]`
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dostępność dzisiaj */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dostępność dzisiaj</span>
            <div className="flex flex-wrap gap-1.5">
              {AVAIL_OPTS.map(({ value, label, cls }) => {
                const active = selectedAvail.has(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggle(setSelectedAvail, value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                      active
                        ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                        : `bg-white border-gray-200 ${cls} hover:border-[#1e3a5f]`
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Results summary ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>
          Wyświetlono{" "}
          <strong className="text-[#1e3a5f]">{filtered.length}</strong>
          {" z "}
          <strong className="text-[#1e3a5f]">{providers.length}</strong>
          {" podmiotów"}
        </span>
        {hasActiveFilters && (
          <span className="text-[#1e3a5f] font-medium">
            {[
              selectedTypes.size   > 0 && `${selectedTypes.size} rodzaj`,
              selectedSvcs.size    > 0 && `${selectedSvcs.size} usług`,
              selectedCoverage.size> 0 && "zasięg",
              selectedStatus.size  > 0 && "status",
              selectedAvail.size   > 0 && "dostępność",
              search.trim()           && "wyszukiwanie",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </div>

      {/* ── Provider cards ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground font-medium">Brak podmiotów pasujących do filtrów</p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 text-xs text-[#1e3a5f] underline"
          >
            Wyczyść filtry
          </button>
        </div>
      ) : showGrouped ? (
        /* Grouped by status (no filters active) */
        <div className="space-y-8">
          {groupedSections.map(({ key, label, items }) => (
            <div key={key} className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                {key === "pending" && <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />}
                {key === "active"  && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
                {key === "suspended" && <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />}
                {label} ({items.length})
              </h2>
              <ProviderGrid items={items} availByProvider={availByProvider} isAdmin={isAdmin} />
            </div>
          ))}
        </div>
      ) : (
        /* Flat list (filters active) */
        <ProviderGrid items={filtered} availByProvider={availByProvider} isAdmin={isAdmin} />
      )}
    </div>
  );
}

// ── Provider grid ─────────────────────────────────────────────────────────────

function ProviderGrid({
  items,
  availByProvider,
  isAdmin,
}: {
  items: ProviderItem[];
  availByProvider: Record<string, AvailabilityItem>;
  isAdmin: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {items.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          avail={availByProvider[provider.id] ?? null}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

// ── Provider card (with inline availability editor) ──────────────────────────

function ProviderCard({
  provider,
  avail,
  isAdmin,
}: {
  provider: ProviderItem;
  avail: AvailabilityItem | null;
  isAdmin: boolean;
}) {
  const [showAvailForm, setShowAvailForm] = useState(false);
  const availCfg = avail ? availStatusCfg[avail.status] : null;
  const provStatus = statusCfg[provider.status] ?? statusCfg.PENDING;
  const isPending = provider.status === "PENDING";

  return (
    <Card
      className={cn(
        "bg-white shadow-sm border-border",
        isPending && "border-yellow-300 bg-yellow-50/30",
      )}
    >
      <CardContent className="p-5">
        {/* Name + link */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Building2 size={20} className="text-[#1e3a5f]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1e3a5f] leading-tight">
                {provider.name}
              </p>
              <p className="text-xs text-muted-foreground">{provider.type}</p>
            </div>
          </div>
          <Link
            href={`/podmioty/${provider.id}`}
            className="text-muted-foreground hover:text-[#1e3a5f] transition-colors flex-shrink-0"
          >
            <ChevronRight size={16} className="mt-1" />
          </Link>
        </div>

        {/* Location + coverage */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={12} className="flex-shrink-0" />
            <span>
              {provider.city}
              {provider.coverageType === "RADIUS" && provider.coverageRadius
                ? ` · zasięg ${provider.coverageRadius} km`
                : ""}
              {provider.coverageType === "CITY_LIST" && provider.coverageCities
                ? ` · ${provider.coverageCities.slice(0, 3).join(", ")}${provider.coverageCities.length > 3 ? "…" : ""}`
                : ""}
            </span>
          </div>
          {provider.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone size={12} className="flex-shrink-0" />
              <span>{provider.phone}</span>
            </div>
          )}
          {provider.rejectionNote && (
            <p className="text-xs text-red-600">{provider.rejectionNote}</p>
          )}
        </div>

        {/* Services tags */}
        {provider.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {provider.services.slice(0, 4).map((svc) => (
              <span
                key={svc}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1e3a5f]/8 text-[#1e3a5f]/80 border border-[#1e3a5f]/10"
              >
                {svc}
              </span>
            ))}
            {provider.services.length > 4 && (
              <span className="text-[10px] text-gray-400 px-1.5 py-0.5">
                +{provider.services.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${provStatus.cls}`}>
            {provStatus.label}
          </span>
          <span className="text-xs text-gray-400">
            {coverageLabel[provider.coverageType] ?? provider.coverageType}
          </span>
          {availCfg ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${availCfg.cls}`}>
              {availCfg.label}
              {avail?.freePlaces ? ` (${avail.freePlaces} miejsc)` : ""}
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Brak danych o dostępności
            </span>
          )}
          {provider.capacity > 0 && (
            <span className="text-xs text-muted-foreground">
              Pojemność: {provider.capacity}
            </span>
          )}
        </div>

        {/* Availability editor toggle */}
        <button
          type="button"
          onClick={() => setShowAvailForm((v) => !v)}
          className={cn(
            "mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
            showAvailForm
              ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
              : "bg-white border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/5",
          )}
          aria-expanded={showAvailForm}
        >
          {showAvailForm ? (
            <>
              <ChevronUp size={12} /> Ukryj edycję dostępności
            </>
          ) : (
            <>
              {avail ? <PencilLine size={12} /> : <CalendarCheck size={12} />}
              {avail ? "Edytuj dostępność dzienną" : "Ustaw dostępność dzienną"}
            </>
          )}
        </button>

        {/* Inline AvailabilityForm */}
        {showAvailForm && (
          <div className="pt-4 mt-1 border-t border-border">
            <AvailabilityForm
              providerId={provider.id}
              capacity={provider.capacity}
              current={
                avail
                  ? {
                      status: avail.status,
                      freePlaces: avail.freePlaces ?? 0,
                      notes: avail.notes,
                    }
                  : null
              }
            />
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-gray-100">
            <ProviderActions providerId={provider.id} currentStatus={provider.status} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
