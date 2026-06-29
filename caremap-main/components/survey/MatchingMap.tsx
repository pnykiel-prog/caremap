"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useMemo } from "react";
import { X, Filter, MapPin } from "lucide-react";

const RZESZOW           = { lat: 50.0412, lon: 22.0 };
const PROVIDER_ACTIVE   = "#1e3a5f";
const PROVIDER_DIM      = "#94a3b8";
const SENIOR_COLOR      = "#C9A84C";

export interface SeniorLocation {
  firstName: string;
  lastName:  string;
  city:      string | null;
  geoLat:    number | null;
  geoLon:    number | null;
  careLevel: number | null;
}

export interface ProviderMarker {
  id:             string;
  name:           string;
  type:           string;
  city:           string;
  geoLat:         number;
  geoLon:         number;
  coverageType:   string;
  coverageRadius: number | null;
  status:         string;
  capacity:       number;
  services:       string[];
}

interface Props {
  senior:    SeniorLocation;
  providers: ProviderMarker[];
}

// ── SVG markers ───────────────────────────────────────────────────────────────
function svgSeniorPin() {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46">
      <path d="M19 0C8.507 0 0 8.507 0 19c0 12.444 19 27 19 27S38 31.444 38 19C38 8.507 29.493 0 19 0z"
        fill="${SENIOR_COLOR}" stroke="white" stroke-width="2.5"/>
      <circle cx="19" cy="18" r="9" fill="white" opacity="0.95"/>
      <text x="19" y="23" text-anchor="middle" font-size="12" font-weight="900"
        fill="${SENIOR_COLOR}" font-family="system-ui">S</text>
    </svg>`)}`;
}

function svgProviderPin(color: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <rect x="8" y="8" width="12" height="10" rx="1.5" fill="white" opacity="0.9"/>
      <rect x="11" y="12" width="6" height="1.5" fill="${color}"/>
      <rect x="11" y="9.5" width="6" height="1.5" fill="${color}"/>
    </svg>`)}`;
}

// ── Availability helpers ──────────────────────────────────────────────────────
interface Availability {
  status:     string;
  freePlaces: number;
  notes:      string | null;
}

const AVAIL_LABEL: Record<string, string> = {
  AVAILABLE: "Dostępny",
  LIMITED:   "Ograniczona dostępność",
  FULL:      "Brak miejsc",
  SUSPENDED: "Zawieszony",
};
const AVAIL_COLOR: Record<string, string> = {
  AVAILABLE: "#16a34a",
  LIMITED:   "#d97706",
  FULL:      "#dc2626",
  SUSPENDED: "#94a3b8",
};

function availabilityHtml(avail: Availability | null, loading: boolean): string {
  if (loading) {
    return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
              ⏳ Sprawdzam dostępność…
            </div>`;
  }
  if (!avail) {
    return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
              Brak danych o dostępności na dziś
            </div>`;
  }
  const color = AVAIL_COLOR[avail.status] ?? "#94a3b8";
  const label = AVAIL_LABEL[avail.status] ?? avail.status;
  return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
      <span style="font-size:12px;font-weight:700;color:${color}">${label}</span>
    </div>
    ${avail.freePlaces > 0
      ? `<div style="font-size:11px;color:#64748b">Wolnych miejsc: <strong>${avail.freePlaces}</strong></div>`
      : ""}
    ${avail.notes
      ? `<div style="font-size:11px;color:#64748b;margin-top:2px;font-style:italic">${avail.notes}</div>`
      : ""}
  </div>`;
}

function basePopupHtml(p: ProviderMarker): string {
  const servicesList = p.services.length
    ? `<div style="margin-top:4px;font-size:11px;color:#64748b;line-height:1.6">${p.services.join(" · ")}</div>`
    : "";
  const coverage =
    p.coverageType === "RADIUS" && p.coverageRadius
      ? `<div style="font-size:11px;color:#1e3a5f;margin-top:3px">📍 Zasięg: ${p.coverageRadius} km</div>`
      : "";
  const capacity =
    p.capacity > 0
      ? `<div style="font-size:11px;color:#64748b;margin-top:2px">Pojemność: ${p.capacity} miejsc</div>`
      : "";
  return `<div style="min-width:210px;font-family:system-ui">
    <div style="font-weight:700;font-size:13px;color:#1e3a5f">${p.name}</div>
    <div style="font-size:11px;color:#64748b;margin-top:1px">${p.type} · ${p.city}</div>
    ${coverage}${capacity}${servicesList}
  </div>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MatchingMap({ senior, providers }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletRef  = useRef<unknown>(null);
  const markersRef  = useRef<Map<string, unknown>>(new Map());
  const popupsRef   = useRef<Map<string, unknown>>(new Map());  // providerId → L.Popup

  const allServices = useMemo(() => {
    const set = new Set<string>();
    providers.forEach((p) => p.services.forEach((s) => set.add(s)));
    return [...set].sort();
  }, [providers]);

  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (svc: string) =>
    setSelected((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  const clearFilter = () => setSelected([]);

  const matchedIds = useMemo(() => {
    if (selected.length === 0) return new Set(providers.map((p) => p.id));
    return new Set(
      providers.filter((p) => selected.some((s) => p.services.includes(s))).map((p) => p.id)
    );
  }, [providers, selected]);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || leafletRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [senior.geoLat ?? RZESZOW.lat, senior.geoLon ?? RZESZOW.lon],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      // Senior marker
      if (senior.geoLat && senior.geoLon) {
        const seniorIcon = L.icon({ iconUrl: svgSeniorPin(), iconSize: [38, 46], iconAnchor: [19, 46], popupAnchor: [0, -46] });
        L.marker([senior.geoLat, senior.geoLon], { icon: seniorIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(`<div style="min-width:170px;font-family:system-ui">
            <div style="font-weight:700;font-size:13px;color:${SENIOR_COLOR}">${senior.firstName} ${senior.lastName}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">📍 ${senior.city ?? "—"}</div>
            ${senior.careLevel ? `<div style="font-size:11px;color:#1e3a5f;font-weight:600;margin-top:4px">Poziom opieki: ${senior.careLevel}</div>` : ""}
          </div>`);
        bounds.push([senior.geoLat, senior.geoLon]);
      }

      // Provider markers with live availability on popup open
      for (const p of providers) {
        const icon = L.icon({ iconUrl: svgProviderPin(PROVIDER_ACTIVE), iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -36] });
        const popup = L.popup({ maxWidth: 260 }).setContent(basePopupHtml(p) + availabilityHtml(null, true));
        popupsRef.current.set(p.id, popup);

        const marker = L.marker([p.geoLat, p.geoLon], { icon })
          .addTo(map)
          .bindPopup(popup);

        // Fetch availability when popup opens
        marker.on("popupopen", () => {
          // Show loading state
          popup.setContent(basePopupHtml(p) + availabilityHtml(null, true));

          fetch(`/api/providers/${p.id}/availability`)
            .then((r) => r.json())
            .then((data) => {
              const avail: Availability | null = data.success ? data.data : null;
              popup.setContent(basePopupHtml(p) + availabilityHtml(avail, false));
              popup.update();
            })
            .catch(() => {
              popup.setContent(basePopupHtml(p) + availabilityHtml(null, false));
              popup.update();
            });
        });

        markersRef.current.set(p.id, marker);
        bounds.push([p.geoLat, p.geoLon]);

        // Coverage circle
        if (p.coverageType === "RADIUS" && p.coverageRadius) {
          L.circle([p.geoLat, p.geoLon], {
            radius:      p.coverageRadius * 1000,
            color:       PROVIDER_ACTIVE,
            fillColor:   PROVIDER_ACTIVE,
            fillOpacity: 0.04,
            weight:      1.5,
            dashArray:   "5,5",
          }).addTo(map);
        }
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 14 });
      }
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (leafletRef.current as any)?.remove();
      leafletRef.current = null;
      markersRef.current.clear();
      popupsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update marker opacity on filter change ─────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current) return;
    import("leaflet").then((L) => {
      for (const [id, markerUnknown] of markersRef.current.entries()) {
        const marker  = markerUnknown as L.Marker;
        const matched = matchedIds.has(id);
        marker.setOpacity(matched ? 1 : 0.3);
        marker.setIcon(L.icon({
          iconUrl:     svgProviderPin(matched ? PROVIDER_ACTIVE : PROVIDER_DIM),
          iconSize:    [28, 36],
          iconAnchor:  [14, 36],
          popupAnchor: [0, -36],
        }));
      }
    });
  }, [matchedIds]);

  const matchedCount = matchedIds.size;

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#1e3a5f]" />
            <span className="text-sm font-semibold text-[#1e3a5f]">Filtruj według usługi</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {matchedCount} z {providers.length} podmiotów
            </span>
            {selected.length > 0 && (
              <button
                onClick={clearFilter}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
              >
                <X size={11} /> Wyczyść
              </button>
            )}
          </div>
        </div>

        {allServices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Brak danych o usługach podmiotów.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {allServices.map((svc) => {
              const active = selected.includes(svc);
              const count  = providers.filter((p) => p.services.includes(svc)).length;
              return (
                <button
                  key={svc}
                  onClick={() => toggle(svc)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                      : "bg-white text-gray-600 border-gray-300 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
                  }`}
                >
                  {svc}
                  <span className={`text-[10px] ${active ? "text-white/70" : "text-gray-400"}`}>({count})</span>
                  {active && <X size={10} />}
                </button>
              );
            })}
          </div>
        )}

        {selected.length > 0 && (
          <p className="text-xs text-[#1e3a5f] font-medium">
            Wyfiltrowano:{" "}
            <span className="font-normal text-gray-600">{selected.join(", ")}</span>
          </p>
        )}
      </div>

      {/* No senior coords warning */}
      {!senior.geoLat && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <MapPin size={13} className="flex-shrink-0" />
          Senior nie ma przypisanych współrzędnych — lokalizacja nieznana. Mapa wyświetla podmioty w regionie.
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        style={{ height: "480px", width: "100%", borderRadius: "10px", zIndex: 0, position: "relative" }}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: SENIOR_COLOR }} />
          <span>Lokalizacja seniora</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: PROVIDER_ACTIVE }} />
          <span>Podmiot pasujący do filtru</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-slate-300 flex-shrink-0" />
          <span>Podmiot poza filtrem</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0 border-t-2 border-dashed border-[#1e3a5f]" />
          <span>Zasięg terytorialny</span>
        </div>
        <div className="text-gray-400 ml-auto italic">
          Kliknij marker podmiotu aby sprawdzić bieżącą dostępność
        </div>
      </div>
    </div>
  );
}
