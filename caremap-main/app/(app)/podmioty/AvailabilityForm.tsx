"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Dostępny", desc: "Są wolne miejsca", cls: "border-green-300 bg-green-50 text-green-700", dot: "bg-green-500" },
  { value: "LIMITED", label: "Ograniczona", desc: "Mało wolnych miejsc", cls: "border-yellow-300 bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  { value: "FULL", label: "Brak miejsc", desc: "Podmiot jest pełny", cls: "border-red-300 bg-red-50 text-red-700", dot: "bg-red-500" },
  { value: "SUSPENDED", label: "Zawieszone", desc: "Działalność zawieszona", cls: "border-gray-300 bg-gray-50 text-gray-500", dot: "bg-gray-400" },
] as const;

interface CurrentAvailability {
  status: string;
  freePlaces: number;
  notes: string | null;
}

interface Props {
  providerId: string;
  capacity: number;
  current: CurrentAvailability | null;
}

export default function AvailabilityForm({ providerId, capacity, current }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(current?.status ?? "AVAILABLE");
  const [freePlaces, setFreePlaces] = useState<number>(current?.freePlaces ?? 0);
  const [note, setNote] = useState<string>(current?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, freePlaces, notes: note || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatus(opt.value)}
            className={`flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-all ${
              status === opt.value ? opt.cls + " border-current" : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${opt.dot}`} />
            <div>
              <p className="text-sm font-semibold leading-tight">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Free places */}
      {(status === "AVAILABLE" || status === "LIMITED") && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <label className="font-medium text-gray-700">Wolne miejsca:</label>
            <input
              type="number"
              min={0}
              max={capacity > 0 ? capacity : undefined}
              value={freePlaces}
              onChange={(e) => setFreePlaces(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
            {capacity > 0 && <span className="text-muted-foreground">/ {capacity} pojemność</span>}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Notatka (opcjonalnie)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="np. Przyjmujemy od 09:00, pilna potrzeba kontaktu z koordynatorem..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#16304f] transition-colors disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Zapisuję...</>
          ) : (
            "Zapisz dostępność"
          )}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
            <CheckCircle2 size={15} />
            Zapisano
          </span>
        )}
      </div>
    </div>
  );
}
