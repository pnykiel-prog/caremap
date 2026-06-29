"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { CARE_LEVELS } from "@/lib/survey-algorithm";

// Rzeszów center
const RZESZOW_LAT = 50.0412;
const RZESZOW_LON  = 22.0;
const DEFAULT_ZOOM = 12;

interface SeniorMarker {
  id: string;
  firstName: string;
  lastName: string;
  geoLat: number;
  geoLon: number;
  city: string;
  careLevel: number | null;
}

interface ProviderMarker {
  id: string;
  name: string;
  type: string;
  city: string;
  geoLat: number;
  geoLon: number;
  coverageType: string;
  coverageRadius: number | null;
  coverageCities: unknown;
  status: string;
  capacity: number;
  services: string[];
}

interface MapData {
  seniors: SeniorMarker[];
  providers: ProviderMarker[];
}

// Internal ref entry for a senior marker
interface SeniorMarkerEntry {
  level: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any;
}

const LEVEL_COLORS: Record<number, string> = {
  1: "#16a34a", 2: "#65a30d", 3: "#ca8a04",
  4: "#d97706", 5: "#ea580c", 6: "#dc2626", 7: "#991b1b",
};

function svgCircle(color: string, label: string, dimmed = false) {
  const opacity = dimmed ? 0.25 : 1;
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" opacity="${opacity}">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="16" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="white" font-family="system-ui">${label}</text>
    </svg>`
  )}`;
}

function svgProvider(color: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <rect x="8" y="8" width="12" height="10" rx="1.5" fill="white" opacity="0.9"/>
      <rect x="11" y="12" width="6" height="1.5" fill="${color}"/>
      <rect x="11" y="9.5" width="6" height="1.5" fill="${color}"/>
    </svg>`
  )}`;
}

const PROVIDER_COLOR = "#1e3a5f";
const ALL_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function MapPanel() {
  const [data, setData]               = useState<MapData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  // Empty set = "Wszystkie" (show all)
  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(new Set());

  const mapRef          = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef   = useRef<any>(null);
  const seniorMarkersRef = useRef<SeniorMarkerEntry[]>([]);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError("Nie udało się wczytać danych mapy");
      })
      .catch(() => setError("Błąd połączenia"))
      .finally(() => setLoading(false));
  }, []);

  // ── Init Leaflet map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!data || !mapRef.current || leafletMapRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || leafletMapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        center: [RZESZOW_LAT, RZESZOW_LON],
        zoom: DEFAULT_ZOOM,
      });
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      // ── Providers ────────────────────────────────────────────────────────
      for (const p of data.providers) {
        const icon = L.icon({
          iconUrl: svgProvider(p.status === "ACTIVE" ? PROVIDER_COLOR : "#94a3b8"),
          iconSize:    [28, 36],
          iconAnchor:  [14, 36],
          popupAnchor: [0, -36],
        });

        const servicesList = p.services.length
          ? `<div style="margin-top:4px;font-size:11px;color:#64748b">${p.services.slice(0, 4).join(" · ")}${p.services.length > 4 ? ` +${p.services.length - 4}` : ""}</div>`
          : "";

        const coverageInfo =
          p.coverageType === "RADIUS" && p.coverageRadius
            ? `<div style="font-size:11px;color:#1e3a5f;margin-top:3px">📍 Zasięg: ${p.coverageRadius} km</div>`
            : p.coverageType === "CITY_LIST"
            ? `<div style="font-size:11px;color:#1e3a5f;margin-top:3px">📍 Lista miejscowości</div>`
            : `<div style="font-size:11px;color:#94a3b8;margin-top:3px">📍 Placówka stacjonarna</div>`;

        const popup = `
          <div style="min-width:200px;font-family:system-ui">
            <div style="font-weight:700;font-size:13px;color:#1e3a5f">${p.name}</div>
            <div style="font-size:11px;color:#64748b;margin-top:1px">${p.type} · ${p.city}</div>
            ${coverageInfo}
            ${p.capacity > 0 ? `<div style="font-size:11px;color:#64748b;margin-top:2px">Pojemność: ${p.capacity} miejsc</div>` : ""}
            ${servicesList}
          </div>`;

        L.marker([p.geoLat, p.geoLon], { icon }).addTo(map).bindPopup(popup);
        bounds.push([p.geoLat, p.geoLon]);

        if (p.coverageType === "RADIUS" && p.coverageRadius) {
          L.circle([p.geoLat, p.geoLon], {
            radius:      p.coverageRadius * 1000,
            color:       PROVIDER_COLOR,
            fillColor:   PROVIDER_COLOR,
            fillOpacity: 0.06,
            weight:      1.5,
            dashArray:   "5,5",
          }).addTo(map);
        }
      }

      // ── Seniors ──────────────────────────────────────────────────────────
      seniorMarkersRef.current = [];

      for (const s of data.seniors) {
        const level = s.careLevel;
        const color = level ? (LEVEL_COLORS[level] ?? "#94a3b8") : "#94a3b8";
        const label = level ? String(level) : "?";

        const icon = L.icon({
          iconUrl:     svgCircle(color, label),
          iconSize:    [32, 32],
          iconAnchor:  [16, 16],
          popupAnchor: [0, -18],
        });

        const levelCfg = level ? CARE_LEVELS[level as keyof typeof CARE_LEVELS] : null;
        const popup = `
          <div style="min-width:180px;font-family:system-ui">
            <div style="font-weight:700;font-size:13px;color:#1e3a5f">${s.firstName} ${s.lastName}</div>
            <div style="font-size:11px;color:#64748b;margin-top:1px">${s.city || "—"}</div>
            ${levelCfg
              ? `<div style="margin-top:5px;display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${levelCfg.bg};color:${levelCfg.color}">Poziom ${level} — ${levelCfg.label}</div>`
              : `<div style="font-size:11px;color:#94a3b8;margin-top:4px">Brak oceny opieki</div>`
            }
          </div>`;

        const marker = L.marker([s.geoLat, s.geoLon], { icon }).addTo(map).bindPopup(popup);
        seniorMarkersRef.current.push({ level, marker });
        bounds.push([s.geoLat, s.geoLon]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 14 });
      }

      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      seniorMarkersRef.current = [];
    };
  }, [data]);

  // ── Apply level filter to markers ─────────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    for (const { level, marker } of seniorMarkersRef.current) {
      const visible =
        selectedLevels.size === 0 ||
        (level !== null && selectedLevels.has(level));

      if (visible) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      }
    }
  }, [selectedLevels]);

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const toggleLevel = useCallback((level: number) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }, []);

  const clearFilter = useCallback(() => setSelectedLevels(new Set()), []);

  const visibleSeniorCount =
    selectedLevels.size === 0
      ? (data?.seniors.length ?? 0)
      : (data?.seniors.filter((s) => s.careLevel !== null && selectedLevels.has(s.careLevel)).length ?? 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground text-sm gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-[#1e3a5f] border-t-transparent animate-spin" />
        Wczytywanie mapy...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">
          Filtruj poziom opieki:
        </span>

        {/* "Wszystkie" chip */}
        <button
          type="button"
          onClick={clearFilter}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            selectedLevels.size === 0
              ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
              : "bg-white border-gray-300 text-gray-500 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
          }`}
        >
          Wszystkie
        </button>

        {/* Level chips 1–7 */}
        {ALL_LEVELS.map((level) => {
          const cfg     = CARE_LEVELS[level];
          const count   = data?.seniors.filter((s) => s.careLevel === level).length ?? 0;
          const active  = selectedLevels.has(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                active
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white border-gray-200 hover:border-gray-400"
              }`}
              style={
                active
                  ? { background: cfg.color, borderColor: cfg.color }
                  : { color: cfg.color }
              }
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={
                  active
                    ? { background: "rgba(255,255,255,0.3)", color: "white" }
                    : { background: cfg.bg, color: cfg.color }
                }
              >
                {level}
              </span>
              <span>{cfg.label.split(" ")[0]}</span>
              {count > 0 && (
                <span
                  className="rounded-full px-1 text-[10px] font-bold"
                  style={active ? { background: "rgba(255,255,255,0.25)" } : { background: cfg.bg }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Active filter summary */}
        {selectedLevels.size > 0 && (
          <span className="text-xs text-muted-foreground ml-1">
            — wyświetlono <strong className="text-[#1e3a5f]">{visibleSeniorCount}</strong> seniorów
          </span>
        )}
      </div>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div
        ref={mapRef}
        style={{
          height:       "460px",
          width:        "100%",
          borderRadius: "8px",
          zIndex:       0,
          position:     "relative",
        }}
      />

      {/* ── Bottom info bar + providers legend ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-gray-100">
        {/* Providers legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: PROVIDER_COLOR }} />
            <span>Podmiot aktywny ({data?.providers.filter((p) => p.status === "ACTIVE").length ?? 0})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-400" />
            <span>Oczekujący ({data?.providers.filter((p) => p.status !== "ACTIVE").length ?? 0})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-0 border-t-2 border-dashed" style={{ borderColor: PROVIDER_COLOR }} />
            <span>Zasięg terytorialny</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <strong className="text-[#1e3a5f]">{visibleSeniorCount}</strong>
            {selectedLevels.size > 0 ? ` z ${data?.seniors.length ?? 0}` : ""} seniorów
          </span>
          <span>·</span>
          <span><strong className="text-[#1e3a5f]">{data?.providers.length ?? 0}</strong> podmiotów</span>
        </div>
      </div>
    </div>
  );
}
